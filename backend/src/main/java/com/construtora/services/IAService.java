package com.construtora.services;

import com.construtora.dtos.EmpreendimentoDtos;
import com.construtora.dtos.EmpresaDtos;
import com.construtora.dtos.IaDtos;
import com.construtora.dtos.InstitucionalDtos;
import com.construtora.dtos.MaterialDtos;
import com.construtora.entities.IaInteracao;
import com.construtora.entities.IaUsoMensal;
import com.construtora.exceptions.BadRequestException;
import com.construtora.repositories.IaInteracaoRepository;
import com.construtora.repositories.IaUsoMensalRepository;
import com.construtora.security.AuthUserPrincipal;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class IAService {
    private static final String AI_UNKNOWN_VALUE = "não tenho essa informação confirmada no momento";
    private static final String TOKEN_LIMIT_ERROR_SNIPPET = "cortada por limite de tokens";
    private static final int CONSULTA_PRECO_MAX_UNIDADES_OBJETIVA = 8;
    private static final int CONSULTA_PRECO_MAX_UNIDADES_GERAL = 24;
    private static final int CONSULTA_PRECO_MAX_OUTPUT_TOKENS_OBJETIVA = 420;

    private final CurrentSessionService currentSessionService;
    private final EmpreendimentoService empreendimentoService;
    private final MaterialService materialService;
    private final InstitucionalService institucionalService;
    private final EmpresaService empresaService;
    private final OpenAIService openAIService;
    private final IntentClassifierService intentClassifierService;
    private final PromptStrategyService promptStrategyService;
    private final IaPromptFactory iaPromptFactory;
    private final IaQualityService iaQualityService;
    private final IaContextCacheService iaContextCacheService;
    private final AuditService auditService;
    private final IaInteracaoRepository iaInteracaoRepository;
    private final IaUsoMensalRepository iaUsoMensalRepository;
    private final ObjectMapper objectMapper;
    private final JdbcTemplate jdbcTemplate;
    private final int limitePerguntasMes;

    public IAService(CurrentSessionService currentSessionService,
                     EmpreendimentoService empreendimentoService,
                     MaterialService materialService,
                     InstitucionalService institucionalService,
                     EmpresaService empresaService,
                     OpenAIService openAIService,
                     IntentClassifierService intentClassifierService,
                     PromptStrategyService promptStrategyService,
                     IaPromptFactory iaPromptFactory,
                     IaQualityService iaQualityService,
                     IaContextCacheService iaContextCacheService,
                     AuditService auditService,
                     IaInteracaoRepository iaInteracaoRepository,
                     IaUsoMensalRepository iaUsoMensalRepository,
                     ObjectMapper objectMapper,
                     JdbcTemplate jdbcTemplate,
                     @Value("${app.ai.monthly-question-limit:300}") int limitePerguntasMes) {
        this.currentSessionService = currentSessionService;
        this.empreendimentoService = empreendimentoService;
        this.materialService = materialService;
        this.institucionalService = institucionalService;
        this.empresaService = empresaService;
        this.openAIService = openAIService;
        this.intentClassifierService = intentClassifierService;
        this.promptStrategyService = promptStrategyService;
        this.iaPromptFactory = iaPromptFactory;
        this.iaQualityService = iaQualityService;
        this.iaContextCacheService = iaContextCacheService;
        this.auditService = auditService;
        this.iaInteracaoRepository = iaInteracaoRepository;
        this.iaUsoMensalRepository = iaUsoMensalRepository;
        this.objectMapper = objectMapper;
        this.jdbcTemplate = jdbcTemplate;
        this.limitePerguntasMes = limitePerguntasMes;
    }

    @Transactional
    public IaDtos.RespostaDTO perguntar(IaDtos.PerguntaRequestDTO request) {
        Long empresaIdSessao = currentSessionService.empresaId();
        AuthUserPrincipal currentUser = currentSessionService.currentUser();
        String pergunta = request.pergunta().trim();
        Long empreendimentoIdSelecionado = request.empreendimentoId();
        IaDtos.ContextoModoIA contextoModo = request.contextoModo() == null ? IaDtos.ContextoModoIA.EMPREENDIMENTO : request.contextoModo();
        String nomeUsuario = safeForAi(extrairPrimeiroNome(null, currentUser.getEmail()));

        if (request.empresaId() != null && !empresaIdSessao.equals(request.empresaId())) {
            throw new BadRequestException("Empresa inválida para a sessão atual");
        }
        if (IaDtos.ContextoModoIA.EMPREENDIMENTO.equals(contextoModo) && empreendimentoIdSelecionado == null) {
            throw new BadRequestException("Selecione um empreendimento para continuar");
        }

        IaUsoMensal usoMensal = getOrCreateUsoMensal(empresaIdSessao);
        if (usoMensal.getTotalPerguntas() >= limitePerguntasMes) {
            throw new BadRequestException("Limite mensal de uso da IA atingido");
        }

        if (isOutOfScopeQuestion(pergunta)) {
            return salvarResposta(
                    empresaIdSessao,
                    currentUser.getUserId(),
                    empreendimentoIdSelecionado,
                    pergunta,
                    "Eu só posso ajudar com assuntos ligados ao mercado imobiliário, empreendimentos, materiais comerciais, tabela de vendas e estratégia comercial da construtora.",
                    0,
                    usoMensal
            );
        }

        if (IaDtos.ContextoModoIA.INSTITUCIONAL.equals(contextoModo)) {
            return responderModoInstitucional(empresaIdSessao, currentUser, pergunta, usoMensal, nomeUsuario);
        }

        List<IaInteracao> interacoesEmpreendimento = buscarInteracoesRecentesDoEmpreendimento(
                empresaIdSessao,
                currentUser.getUserId(),
                empreendimentoIdSelecionado
        );
        Optional<IaInteracao> ultimaInteracaoEmpreendimento = interacoesEmpreendimento.stream().findFirst();
        if (isPedidoRefinamentoProposta(pergunta) && ultimaInteracaoEmpreendimento.isPresent()) {
            Optional<UnidadeSolicitadaData> unidadeSolicitada = buscarUnidadeSolicitada(
                    empresaIdSessao,
                    empreendimentoIdSelecionado,
                    ultimaInteracaoEmpreendimento.get().getPergunta()
            );
            if (unidadeSolicitada.isPresent()) {
                CondicoesTabelaVendas condicoesTabelaVendas = buscarCondicoesTabelaVendas(empresaIdSessao, empreendimentoIdSelecionado);
                EmpreendimentoSelecionado empreendimentoSelecionado = resolverEmpreendimentoSelecionado(
                        empresaIdSessao,
                        empreendimentoIdSelecionado,
                        pergunta
                );
                String perfilRefinamento = determinarPerfilProposta(unidadeSolicitada.get().valor());
                String estiloRefinamento = determinarEstiloRefinamento(interacoesEmpreendimento.size());
                OpenAIService.OpenAIResult aiResult = gerarPropostaViaIA(
                        pergunta,
                        empreendimentoSelecionado,
                        unidadeSolicitada.get(),
                        condicoesTabelaVendas,
                        perfilRefinamento,
                        nomeUsuario,
                        ultimaInteracaoEmpreendimento.get().getResposta(),
                        estiloRefinamento
                );
                return salvarResposta(
                        empresaIdSessao,
                        currentUser.getUserId(),
                        empreendimentoIdSelecionado,
                        pergunta,
                        aiResult.resposta(),
                        aiResult.totalTokens(),
                        usoMensal
                );
            }
        }

        IaDtos.IntencaoIA intencao = intentClassifierService.classificarIntencao(pergunta).intencao();
        if (IaDtos.IntencaoIA.CONSULTA_PRECO.equals(intencao)) {
            if (isPedidoProposta(pergunta)) {
                CondicoesTabelaVendas condicoesTabelaVendas = buscarCondicoesTabelaVendas(empresaIdSessao, empreendimentoIdSelecionado);
                EmpreendimentoSelecionado empreendimentoSelecionado = resolverEmpreendimentoSelecionado(
                        empresaIdSessao,
                        empreendimentoIdSelecionado,
                        pergunta
                );
                Optional<UnidadeSolicitadaData> unidadeSolicitada = buscarUnidadeSolicitada(empresaIdSessao, empreendimentoIdSelecionado, pergunta);
                if (unidadeSolicitada.isPresent()) {
                    UnidadeSolicitadaData unidade = unidadeSolicitada.get();
                    if ("RESERVADO".equalsIgnoreCase(unidade.tipoValor())) {
                        OpenAIService.OpenAIResult aiResult = gerarPropostaViaIA(
                                pergunta,
                                empreendimentoSelecionado,
                                unidade,
                                condicoesTabelaVendas,
                                "RESERVADO",
                                nomeUsuario,
                                null,
                                null
                        );
                        return salvarResposta(
                                empresaIdSessao,
                                currentUser.getUserId(),
                                empreendimentoIdSelecionado,
                                pergunta,
                                aiResult.resposta(),
                                aiResult.totalTokens(),
                                usoMensal
                        );
                    }
                }

                Optional<PropostaEconomicaData> propostaEconomica = buscarPropostaPorFaixa(
                        empresaIdSessao,
                        empreendimentoIdSelecionado,
                        pergunta,
                        BigDecimal.ZERO,
                        BigDecimal.valueOf(500_000),
                        true
                );
                if (propostaEconomica.isPresent()) {
                    UnidadeSolicitadaData unidade = toUnidadeSolicitadaData(propostaEconomica.get(), "VALOR");
                    OpenAIService.OpenAIResult aiResult = gerarPropostaViaIA(
                            pergunta,
                            empreendimentoSelecionado,
                            unidade,
                            condicoesTabelaVendas,
                            "ECONOMICO",
                            nomeUsuario,
                            null,
                            null
                    );
                    return salvarResposta(
                            empresaIdSessao,
                            currentUser.getUserId(),
                            empreendimentoIdSelecionado,
                            pergunta,
                            aiResult.resposta(),
                            aiResult.totalTokens(),
                            usoMensal
                    );
                }

                Optional<PropostaEconomicaData> propostaMedioPadrao = buscarPropostaPorFaixa(
                        empresaIdSessao,
                        empreendimentoIdSelecionado,
                        pergunta,
                        BigDecimal.valueOf(500_000),
                        BigDecimal.valueOf(1_500_000),
                        false
                );
                if (propostaMedioPadrao.isPresent()) {
                    UnidadeSolicitadaData unidade = toUnidadeSolicitadaData(propostaMedioPadrao.get(), "VALOR");
                    OpenAIService.OpenAIResult aiResult = gerarPropostaViaIA(
                            pergunta,
                            empreendimentoSelecionado,
                            unidade,
                            condicoesTabelaVendas,
                            "MEDIO_PADRAO",
                            nomeUsuario,
                            null,
                            null
                    );
                    return salvarResposta(
                            empresaIdSessao,
                            currentUser.getUserId(),
                            empreendimentoIdSelecionado,
                            pergunta,
                            aiResult.resposta(),
                            aiResult.totalTokens(),
                            usoMensal
                    );
                }

                Optional<PropostaEconomicaData> propostaAltoPadrao = buscarPropostaPorFaixa(
                        empresaIdSessao,
                        empreendimentoIdSelecionado,
                        pergunta,
                        BigDecimal.valueOf(1_500_000),
                        BigDecimal.valueOf(999_999_999),
                        false
                );
                if (propostaAltoPadrao.isPresent()) {
                    UnidadeSolicitadaData unidade = toUnidadeSolicitadaData(propostaAltoPadrao.get(), "VALOR");
                    OpenAIService.OpenAIResult aiResult = gerarPropostaViaIA(
                            pergunta,
                            empreendimentoSelecionado,
                            unidade,
                            condicoesTabelaVendas,
                            "ALTO_PADRAO",
                            nomeUsuario,
                            null,
                            null
                    );
                    return salvarResposta(
                            empresaIdSessao,
                            currentUser.getUserId(),
                            empreendimentoIdSelecionado,
                            pergunta,
                            aiResult.resposta(),
                            aiResult.totalTokens(),
                            usoMensal
                    );
                }

                if (unidadeSolicitada.isPresent()) {
                    OpenAIService.OpenAIResult aiResult = gerarPropostaViaIA(
                            pergunta,
                            empreendimentoSelecionado,
                            unidadeSolicitada.get(),
                            condicoesTabelaVendas,
                            "INDEFINIDO",
                            nomeUsuario,
                            null,
                            null
                    );
                    return salvarResposta(
                            empresaIdSessao,
                            currentUser.getUserId(),
                            empreendimentoIdSelecionado,
                            pergunta,
                            aiResult.resposta(),
                            aiResult.totalTokens(),
                            usoMensal
                    );
                }
            }

            ConsultaPrecoContexto consultaPrecoContexto = buildConsultaPrecoContexto(
                    empresaIdSessao,
                    empreendimentoIdSelecionado,
                    pergunta,
                    nomeUsuario
            );
            String userPromptConsultaPreco = """
                    Aqui está o contexto em JSON:
                    %s

                    Pergunta do time comercial:
                    %s
                    """.formatted(consultaPrecoContexto.contextoJson(), pergunta);
            if (consultaPrecoContexto.perguntaObjetiva()) {
                userPromptConsultaPreco = userPromptConsultaPreco + """

                        Responda de forma direta e curta, priorizando somente as unidades realmente relacionadas ao pedido.
                        Se houver tabela Markdown, traga apenas as linhas essenciais para responder.
                        """;
            }

            String systemPromptConsulta = promptStrategyService.montarSystemPromptFinal(
                    iaPromptFactory.buildInventorySystemPromptBase(),
                    consultaPrecoContexto.precoReferencia(),
                    consultaPrecoContexto.possuiReservado()
            );
            OpenAIService.OpenAIResult aiResult = perguntaComFallbackPorLimite(
                    systemPromptConsulta,
                    userPromptConsultaPreco,
                    consultaPrecoContexto.perguntaObjetiva() ? CONSULTA_PRECO_MAX_OUTPUT_TOKENS_OBJETIVA : null
            );
            String respostaSanitizada = removerColunasStatusDaTabelaMarkdown(aiResult.resposta());
            return salvarResposta(
                    empresaIdSessao,
                    currentUser.getUserId(),
                    empreendimentoIdSelecionado,
                    pergunta,
                    respostaSanitizada,
                    aiResult.totalTokens(),
                    usoMensal
            );
        }

        ContextoEstaticoEmpreendimento contextoEstatico = obterContextoEstaticoEmpreendimento(
                empresaIdSessao,
                empreendimentoIdSelecionado
        );
        List<IaInteracao> memoriaUsuario = iaInteracaoRepository
                .findTop5ByEmpresaIdAndUsuarioIdOrderByCreatedAtDesc(empresaIdSessao, currentUser.getUserId());

        String systemPrompt = promptStrategyService.montarSystemPromptFinal(
                iaPromptFactory.buildSystemPromptBase(),
                contextoEstatico.precoReferencia(),
                contextoEstatico.possuiReservado()
        );
        String tipoRespostaEsperada = isObjectiveQuestion(pergunta) ? "objetiva" : "completa";
        String contextoJson = buildConsolidatedContextJson(
                empresaIdSessao,
                pergunta,
                tipoRespostaEsperada,
                empreendimentoIdSelecionado,
                contextoEstatico.empreendimentosFiltrados(),
                contextoEstatico.materiaisFiltrados(),
                contextoEstatico.inventarioTabela(),
                memoriaUsuario,
                nomeUsuario
        );
        String userPrompt = """
                Aqui estão os dados consolidados do sistema em JSON:
                %s

                Pergunta do time comercial:
                %s
                """.formatted(contextoJson, pergunta);

        OpenAIService.OpenAIResult aiResult = perguntaComFallbackPorLimite(systemPrompt, userPrompt, null);
        String respostaSanitizada = removerColunasStatusDaTabelaMarkdown(aiResult.resposta());
        return salvarResposta(
                empresaIdSessao,
                currentUser.getUserId(),
                empreendimentoIdSelecionado,
                pergunta,
                respostaSanitizada,
                aiResult.totalTokens(),
                usoMensal
        );
    }

    private IaDtos.RespostaDTO responderModoInstitucional(Long empresaIdSessao,
                                                          AuthUserPrincipal currentUser,
                                                          String pergunta,
                                                          IaUsoMensal usoMensal,
                                                          String nomeUsuario) {
        EmpresaDtos.EmpresaResponse empresa = empresaService.getMyEmpresa();
        List<InstitucionalDtos.InstitucionalArquivoResponse> institucionais = institucionalService.list();
        List<IaInteracao> memoriaUsuario = iaInteracaoRepository
                .findTop5ByEmpresaIdAndUsuarioIdOrderByCreatedAtDesc(empresaIdSessao, currentUser.getUserId());

        Map<String, Object> contexto = new LinkedHashMap<>();
        Map<String, Object> empresaContexto = new LinkedHashMap<>();
        empresaContexto.put("id", empresa.id());
        empresaContexto.put("nome", blank(empresa.nome()));
        empresaContexto.put("cnpj", blank(empresa.cnpj()));
        empresaContexto.put("plano", empresa.plano() == null ? null : empresa.plano().name());
        empresaContexto.put("iconeUrl", blank(empresa.iconeUrl()));
        contexto.put("contextoTipo", "INSTITUCIONAL_EMPRESA");
        contexto.put("empresa", empresaContexto);
        contexto.put("nomeUsuario", safeForAi(nomeUsuario));
        contexto.put("perguntaAtual", pergunta);
        contexto.put("institucional", institucionais.stream()
                .map(item -> {
                    Map<String, Object> institucionalItem = new LinkedHashMap<>();
                    institucionalItem.put("titulo", blank(item.titulo()));
                    institucionalItem.put("arquivoNome", blank(item.arquivoNome()));
                    institucionalItem.put("arquivoUrl", blank(item.arquivoUrl()));
                    institucionalItem.put("link", blank(item.link()));
                    return institucionalItem;
                })
                .toList());
        contexto.put("memoriaCurta", memoriaUsuario == null ? List.of() : memoriaUsuario.stream()
                .sorted(Comparator.comparing(IaInteracao::getCreatedAt))
                .limit(5)
                .map(item -> Map.of(
                        "pergunta", blank(item.getPergunta()),
                        "resposta", blank(item.getResposta())
                ))
                .toList());

        String contextoJson;
        try {
            contextoJson = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(sanitizeForAi(contexto));
        } catch (JsonProcessingException ex) {
            throw new BadRequestException("Falha ao montar o contexto institucional da IA");
        }

        String userPrompt = """
                Aqui estão os dados institucionais da construtora em JSON:
                %s

                Pergunta do time comercial:
                %s
                """.formatted(contextoJson, pergunta);

        OpenAIService.OpenAIResult aiResult = perguntaComFallbackPorLimite(
                iaPromptFactory.buildInstitutionalStrategySystemPrompt(),
                userPrompt,
                null
        );
        return salvarResposta(
                empresaIdSessao,
                currentUser.getUserId(),
                null,
                pergunta,
                aiResult.resposta(),
                aiResult.totalTokens(),
                usoMensal
        );
    }

    @Transactional(readOnly = true)
    public List<IaDtos.InteracaoResponseDTO> listarInteracoesRecentes() {
        AuthUserPrincipal currentUser = currentSessionService.currentUser();
        Long empresaIdSessao = currentSessionService.empresaId();

        return iaInteracaoRepository
                .findTop20ByEmpresaIdAndUsuarioIdOrderByCreatedAtDesc(empresaIdSessao, currentUser.getUserId())
                .stream()
                .map(item -> new IaDtos.InteracaoResponseDTO(
                        item.getId(),
                        item.getEmpreendimentoId(),
                        item.getPergunta(),
                        item.getResposta(),
                        item.getTokensUsados(),
                        item.getNotaQualidade(),
                        item.getRespostaAjustada(),
                        item.getCreatedAt()
                ))
                .toList();
    }

    @Scheduled(cron = "0 30 2 * * *")
    @Transactional
    public void limparInteracoesAntigas() {
        Instant cutoff = Instant.now().minusSeconds(30L * 24 * 60 * 60);
        iaInteracaoRepository.deleteByCreatedAtBefore(cutoff);
    }

    private IaUsoMensal getOrCreateUsoMensal(Long empresaId) {
        LocalDate mesAtual = LocalDate.now().withDayOfMonth(1);
        return iaUsoMensalRepository.findByEmpresaIdAndMes(empresaId, mesAtual)
                .orElseGet(() -> IaUsoMensal.builder()
                        .empresaId(empresaId)
                        .mes(mesAtual)
                        .totalPerguntas(0)
                        .totalTokens(0)
                        .build());
    }

    private IaDtos.RespostaDTO salvarResposta(Long empresaId,
                                              Long usuarioId,
                                              Long empreendimentoId,
                                              String pergunta,
                                              String resposta,
                                              int tokens,
                                              IaUsoMensal usoMensal) {
        String respostaOriginal = resposta == null ? "" : resposta;
        String respostaFinal = sanitizarRespostaFinal(resposta);
        boolean respostaAjustada = !respostaFinal.equals(respostaOriginal);
        int notaQualidade = iaQualityService.calcularNota(pergunta, respostaFinal, respostaAjustada);
        Instant now = Instant.now();
        iaInteracaoRepository.save(IaInteracao.builder()
                .empresaId(empresaId)
                .usuarioId(usuarioId)
                .empreendimentoId(empreendimentoId)
                .pergunta(pergunta)
                .resposta(respostaFinal)
                .respostaOriginal(respostaOriginal)
                .respostaAjustada(respostaAjustada)
                .notaQualidade(notaQualidade)
                .tokensUsados(tokens)
                .createdAt(now)
                .build());

        auditService.log(
                respostaAjustada ? "IA_RESPONSE_ADJUSTED" : "IA_RESPONSE_APPROVED",
                "IA_INTERACAO",
                usuarioId,
                "system"
        );

        usoMensal.setTotalPerguntas((usoMensal.getTotalPerguntas() == null ? 0 : usoMensal.getTotalPerguntas()) + 1);
        usoMensal.setTotalTokens((usoMensal.getTotalTokens() == null ? 0 : usoMensal.getTotalTokens()) + tokens);
        usoMensal.setUpdatedAt(now);
        iaUsoMensalRepository.save(usoMensal);

        return new IaDtos.RespostaDTO(
                empresaId,
                respostaFinal,
                tokens,
                usoMensal.getTotalPerguntas(),
                usoMensal.getTotalTokens(),
                limitePerguntasMes,
                now
        );
    }

    private ConsultaPrecoContexto buildConsultaPrecoContexto(Long empresaId,
                                                             Long empreendimentoIdSelecionado,
                                                             String pergunta,
                                                             String nomeUsuario) {
        EmpreendimentoSelecionado empreendimentoSelecionado = resolverEmpreendimentoSelecionado(
                empresaId,
                empreendimentoIdSelecionado,
                pergunta
        );
        IaContextCacheService.ConsultaPrecoCacheData cacheData = iaContextCacheService
                .getConsultaPreco(empresaId, empreendimentoSelecionado.id())
                .orElseGet(() -> {
                    IaContextCacheService.ConsultaPrecoCacheData loaded = carregarConsultaPrecoCacheData(empresaId, empreendimentoSelecionado);
                    iaContextCacheService.putConsultaPreco(empresaId, empreendimentoSelecionado.id(), loaded);
                    return loaded;
                });

        boolean perguntaObjetiva = isObjectiveQuestion(pergunta);
        List<Map<String, Object>> unidadesRelevantes = selecionarUnidadesRelevantes(cacheData.unidades(), pergunta, perguntaObjetiva);
        List<Map<String, Object>> unidadesComPrecoConfirmado = extrairUnidadesComPrecoConfirmado(unidadesRelevantes);

        Map<String, Object> contexto = new LinkedHashMap<>();
        contexto.put("tipoContexto", "CONSULTA_PRECO");
        contexto.put("nomeEmpreendimentoPesquisado", cacheData.nomeEmpreendimento());
        contexto.put("empreendimento", cacheData.empreendimento());
        contexto.put("totalUnidades", cacheData.unidades().size());
        contexto.put("totalUnidadesNoContexto", unidadesRelevantes.size());
        contexto.put("contextoCompactado", perguntaObjetiva || unidadesRelevantes.size() < cacheData.unidades().size());
        contexto.put("filtroAplicado", descreverFiltroConsultaPreco(pergunta, unidadesRelevantes, cacheData.unidades().size()));
        contexto.put("resumoInventario", buildResumoInventarioConsultaPreco(cacheData.unidades()));
        contexto.put("quantidadeComPrecoConfirmado", unidadesComPrecoConfirmado.size());
        contexto.put("unidadesComPrecoConfirmado", unidadesComPrecoConfirmado);
        contexto.put("unidades", unidadesRelevantes);
        contexto.put("solicitacaoUsuario", pergunta);
        contexto.put("nomeUsuario", safeForAi(nomeUsuario));
        contexto.put("sistema", Map.of("perfilPreco", "AUTO_DETECT"));

        try {
            return new ConsultaPrecoContexto(
                    objectMapper.writeValueAsString(sanitizeForAi(contexto)),
                    cacheData.precoReferencia(),
                    cacheData.possuiReservado(),
                    perguntaObjetiva
            );
        } catch (JsonProcessingException ex) {
            throw new BadRequestException("Falha ao montar contexto de preço");
        }
    }

    private List<Map<String, Object>> selecionarUnidadesRelevantes(List<Map<String, Object>> unidades,
                                                                   String pergunta,
                                                                   boolean perguntaObjetiva) {
        if (unidades == null || unidades.isEmpty()) {
            return List.of();
        }

        Integer andarSolicitado = extrairNumeroPorPadrao(pergunta, "(?i)(pavimento|andar)\\s*(\\d{1,3})");
        Integer tipoSolicitado = extrairNumeroPorPadrao(pergunta, "(?i)tipo\\s*(\\d{1,3})");
        String unidadeSolicitada = extrairCodigoUnidadeSolicitado(pergunta);

        List<Map<String, Object>> filtradas = unidades.stream()
                .filter(item -> unidadeSolicitada == null || unidadeSolicitada.equals(normalizarCodigoUnidade(item.get("unidade"))))
                .filter(item -> andarSolicitado == null || andarSolicitado.equals(parseIntegerValue(item.get("andar"))))
                .filter(item -> tipoSolicitado == null || tipoSolicitado.equals(extrairTipoNumero(item.get("tipo"))))
                .toList();

        if (!filtradas.isEmpty()) {
            return limitarUnidadesConsultaPreco(ordenarUnidadesParaConsultaPreco(filtradas), perguntaObjetiva ? CONSULTA_PRECO_MAX_UNIDADES_OBJETIVA : CONSULTA_PRECO_MAX_UNIDADES_GERAL);
        }

        if (perguntaObjetiva) {
            return limitarUnidadesConsultaPreco(ordenarUnidadesParaConsultaPreco(unidades), CONSULTA_PRECO_MAX_UNIDADES_OBJETIVA);
        }

        return limitarUnidadesConsultaPreco(ordenarUnidadesParaConsultaPreco(unidades), CONSULTA_PRECO_MAX_UNIDADES_GERAL);
    }

    private List<Map<String, Object>> ordenarUnidadesParaConsultaPreco(List<Map<String, Object>> unidades) {
        return unidades.stream()
                .sorted(Comparator
                        .comparing((Map<String, Object> item) -> possuiPrecoConfirmado(item)).reversed()
                        .thenComparing(item -> "DISPONIVEL".equalsIgnoreCase(String.valueOf(item.get("disponibilidadeComercial"))), Comparator.reverseOrder())
                        .thenComparing(item -> parseIntegerValue(item.get("andar")), Comparator.nullsLast(Integer::compareTo))
                        .thenComparing(item -> extrairTipoNumero(item.get("tipo")), Comparator.nullsLast(Integer::compareTo))
                        .thenComparing(item -> normalizarCodigoUnidade(item.get("unidade")), Comparator.nullsLast(String::compareTo)))
                .toList();
    }

    private List<Map<String, Object>> limitarUnidadesConsultaPreco(List<Map<String, Object>> unidades, int limite) {
        return unidades.stream()
                .limit(limite)
                .map(item -> {
                    Map<String, Object> clone = new LinkedHashMap<>();
                    clone.put("unidade", item.get("unidade"));
                    clone.put("andar", item.get("andar"));
                    clone.put("preco", item.get("preco"));
                    clone.put("tipo", item.get("tipo"));
                    clone.put("metragem", item.get("metragem"));
                    clone.put("suites", item.get("suites"));
                    clone.put("vagas", item.get("vagas"));
                    return clone;
                })
                .toList();
    }

    private List<Map<String, Object>> extrairUnidadesComPrecoConfirmado(List<Map<String, Object>> unidades) {
        List<Map<String, Object>> confirmadas = new ArrayList<>();
        for (Map<String, Object> item : unidades) {
            if (!possuiPrecoConfirmado(item)) {
                continue;
            }
            Map<String, Object> clone = new LinkedHashMap<>();
            clone.put("unidade", item.get("unidade"));
            clone.put("andar", item.get("andar"));
            clone.put("tipo", item.get("tipo"));
            clone.put("preco", item.get("preco"));
            clone.put("metragem", item.get("metragem"));
            clone.put("suites", item.get("suites"));
            clone.put("vagas", item.get("vagas"));
            confirmadas.add(clone);
        }
        return confirmadas;
    }

    private boolean possuiPrecoConfirmado(Map<String, Object> item) {
        BigDecimal preco = toBigDecimal(item.get("preco"));
        return preco != null && preco.compareTo(BigDecimal.ZERO) > 0;
    }

    private Map<String, Object> buildResumoInventarioConsultaPreco(List<Map<String, Object>> unidades) {
        Map<String, Object> resumo = new LinkedHashMap<>();
        long disponiveis = unidades.stream()
                .filter(item -> "DISPONIVEL".equalsIgnoreCase(String.valueOf(item.get("disponibilidadeComercial"))))
                .count();
        long reservadas = unidades.size() - disponiveis;
        resumo.put("quantidadeDisponivel", disponiveis);
        resumo.put("quantidadeEmFechamento", reservadas);
        resumo.put("menorPreco", unidades.stream()
                .map(item -> toBigDecimal(item.get("preco")))
                .filter(java.util.Objects::nonNull)
                .min(BigDecimal::compareTo)
                .orElse(null));
        resumo.put("maiorPreco", unidades.stream()
                .map(item -> toBigDecimal(item.get("preco")))
                .filter(java.util.Objects::nonNull)
                .max(BigDecimal::compareTo)
                .orElse(null));
        return resumo;
    }

    private String descreverFiltroConsultaPreco(String pergunta,
                                                List<Map<String, Object>> unidadesRelevantes,
                                                int totalUnidades) {
        Integer andarSolicitado = extrairNumeroPorPadrao(pergunta, "(?i)(pavimento|andar)\\s*(\\d{1,3})");
        Integer tipoSolicitado = extrairNumeroPorPadrao(pergunta, "(?i)tipo\\s*(\\d{1,3})");
        String unidadeSolicitada = extrairCodigoUnidadeSolicitado(pergunta);

        if (unidadeSolicitada != null) {
            return "UNIDADE_" + unidadeSolicitada;
        }
        if (andarSolicitado != null && tipoSolicitado != null) {
            return "ANDAR_" + andarSolicitado + "_TIPO_" + tipoSolicitado + "_MATCHES_" + unidadesRelevantes.size();
        }
        if (andarSolicitado != null) {
            return "ANDAR_" + andarSolicitado + "_MATCHES_" + unidadesRelevantes.size();
        }
        if (tipoSolicitado != null) {
            return "TIPO_" + tipoSolicitado + "_MATCHES_" + unidadesRelevantes.size();
        }
        if (unidadesRelevantes.size() < totalUnidades) {
            return "AMOSTRA_COMPACTA_" + unidadesRelevantes.size();
        }
        return "SEM_FILTRO";
    }

    private String extrairCodigoUnidadeSolicitado(String pergunta) {
        if (pergunta == null || pergunta.isBlank()) {
            return null;
        }
        Matcher matcher = Pattern.compile("(?i)unidade\\s*([a-z0-9\\-\\/]{1,12})").matcher(pergunta);
        if (!matcher.find()) {
            return null;
        }
        return normalizarCodigoUnidade(matcher.group(1));
    }

    private String normalizarCodigoUnidade(Object unidade) {
        if (unidade == null) {
            return null;
        }
        String valor = String.valueOf(unidade).trim();
        if (valor.isBlank()) {
            return null;
        }
        return valor.replaceAll("\\s+", "").toUpperCase(Locale.ROOT);
    }

    private Integer extrairTipoNumero(Object tipo) {
        if (tipo == null) {
            return null;
        }
        if (tipo instanceof Number number) {
            return number.intValue();
        }
        return extrairNumeroPorPadrao(String.valueOf(tipo), "(?i)tipo\\s*(\\d{1,3})");
    }

    private Integer parseIntegerValue(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value).trim());
        } catch (Exception ignored) {
            return null;
        }
    }

    private IaContextCacheService.ConsultaPrecoCacheData carregarConsultaPrecoCacheData(Long empresaId,
                                                                                         EmpreendimentoSelecionado empreendimentoSelecionado) {
        Map<String, Object> empreendimento = jdbcTemplate.query(
                """
                SELECT id, nome
                FROM empreendimento
                WHERE empresa_id = ?
                  AND id = ?
                LIMIT 1
                """,
                rs -> {
                    if (!rs.next()) {
                        return null;
                    }
                    Map<String, Object> data = new LinkedHashMap<>();
                    data.put("id", rs.getLong("id"));
                    data.put("nome", rs.getString("nome"));
                    return data;
                },
                empresaId, empreendimentoSelecionado.id()
        );

        if (empreendimento == null) {
            throw new BadRequestException("Empreendimento citado não encontrado no banco de dados");
        }

        Long empreendimentoId = ((Number) empreendimento.get("id")).longValue();
        List<Map<String, Object>> unidades = jdbcTemplate.query(
                """
                SELECT tu.codigo_unidade,
                       tu.tipo_valor,
                       tu.valor,
                       t.titulo AS tipo,
                       t.area_metragem,
                       t.quantidade_suites,
                       t.quantidade_vagas
                FROM empreendimento_tipo_unidade tu
                INNER JOIN empreendimento_tipo t ON t.id = tu.tipo_id
                WHERE t.empreendimento_id = ?
                ORDER BY tu.codigo_unidade ASC
                """,
                (rs, rowNum) -> {
                    String codigoUnidade = rs.getString("codigo_unidade");
                    String tipoValor = rs.getString("tipo_valor");
                    BigDecimal valor = rs.getBigDecimal("valor");
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("unidade", codigoUnidade);
                    row.put("andar", extrairAndar(codigoUnidade));
                    row.put("preco", valor);
                    row.put("disponibilidadeComercial", mapearDisponibilidadeComercial(tipoValor));
                    row.put("tipo", rs.getString("tipo"));
                    row.put("metragem", rs.getBigDecimal("area_metragem"));
                    row.put("suites", rs.getInt("quantidade_suites"));
                    row.put("vagas", rs.getInt("quantidade_vagas"));
                    return row;
                },
                empreendimentoId
        );

        BigDecimal precoReferencia = calcularPrecoReferenciaPorUnidades(unidades);
        boolean possuiReservado = unidades.stream()
                .map(item -> item.get("disponibilidadeComercial"))
                .filter(String.class::isInstance)
                .map(String.class::cast)
                .anyMatch(value -> "EM_PROCESSO_DE_FECHAMENTO".equalsIgnoreCase(value));

        return new IaContextCacheService.ConsultaPrecoCacheData(
                empreendimentoSelecionado.nome(),
                empreendimento,
                unidades,
                precoReferencia,
                possuiReservado
        );
    }

    private EmpreendimentoSelecionado resolverEmpreendimentoSelecionado(Long empresaId,
                                                                        Long empreendimentoIdSelecionado,
                                                                        String pergunta) {
        if (empreendimentoIdSelecionado == null) {
            throw new BadRequestException("Selecione um empreendimento para continuar");
        }

        EmpreendimentoSelecionado selecionado = jdbcTemplate.query(
                """
                SELECT id, nome
                FROM empreendimento
                WHERE empresa_id = ?
                  AND id = ?
                LIMIT 1
                """,
                rs -> {
                    if (!rs.next()) {
                        return null;
                    }
                    return new EmpreendimentoSelecionado(
                            rs.getLong("id"),
                            rs.getString("nome")
                    );
                },
                empresaId, empreendimentoIdSelecionado
        );

        if (selecionado == null) {
            throw new BadRequestException("Empreendimento inválido para a sessão atual");
        }

        return selecionado;
    }

    private String extrairAndar(String codigoUnidade) {
        if (codigoUnidade == null || codigoUnidade.isBlank()) {
            return null;
        }

        String digitos = codigoUnidade.replaceAll("\\D", "");
        if (digitos.isEmpty()) {
            return null;
        }
        if (digitos.length() >= 3) {
            return digitos.substring(0, digitos.length() - 2);
        }
        return digitos;
    }

    private String normalizarTexto(String valor) {
        if (valor == null) {
            return "";
        }
        String normalized = java.text.Normalizer.normalize(valor, java.text.Normalizer.Form.NFD);
        return normalized.replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT).trim();
    }

    private Object sanitizeForAi(Object value) {
        if (value == null) {
            return AI_UNKNOWN_VALUE;
        }

        if (value instanceof Map<?, ?> map) {
            Map<String, Object> sanitized = new LinkedHashMap<>();
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                String key = entry.getKey() == null ? "desconhecido" : String.valueOf(entry.getKey());
                sanitized.put(key, sanitizeForAi(entry.getValue()));
            }
            return sanitized;
        }

        if (value instanceof List<?> list) {
            return list.stream().map(this::sanitizeForAi).toList();
        }

        return value;
    }

    private String safeForAi(String value) {
        return value == null || value.isBlank() ? AI_UNKNOWN_VALUE : value.trim();
    }

    private String extrairPrimeiroNome(String nomeCompleto, String email) {
        if (nomeCompleto != null && !nomeCompleto.isBlank()) {
            String[] partes = nomeCompleto.trim().split("\\s+");
            if (partes.length > 0 && !partes[0].isBlank()) {
                return partes[0];
            }
        }

        if (email != null && !email.isBlank()) {
            String localPart = email.split("@")[0].trim();
            if (!localPart.isBlank()) {
                String cleaned = localPart.replace('.', ' ').replace('_', ' ').replace('-', ' ');
                String[] partes = cleaned.trim().split("\\s+");
                if (partes.length > 0 && !partes[0].isBlank()) {
                    String first = partes[0];
                    return first.substring(0, 1).toUpperCase(Locale.ROOT) + first.substring(1).toLowerCase(Locale.ROOT);
                }
            }
        }

        return "Cliente";
    }

    private PromptContexto extrairPromptContextoDosEmpreendimentos(List<EmpreendimentoDtos.EmpreendimentoResponse> empreendimentos) {
        if (empreendimentos == null || empreendimentos.isEmpty()) {
            return new PromptContexto(BigDecimal.ZERO, false);
        }

        BigDecimal precoReferencia = null;
        boolean possuiReservado = false;

        for (EmpreendimentoDtos.EmpreendimentoResponse empreendimento : empreendimentos) {
            if (empreendimento.tipos() == null) {
                continue;
            }
            for (EmpreendimentoDtos.TipoResponse tipo : empreendimento.tipos()) {
                if (tipo.unidades() == null) {
                    continue;
                }
                for (EmpreendimentoDtos.TipoUnidadeResponse unidade : tipo.unidades()) {
                    String tipoValor = unidade.tipoValor() == null ? "" : unidade.tipoValor().trim().toUpperCase(Locale.ROOT);
                    if ("RESERVADO".equals(tipoValor)) {
                        possuiReservado = true;
                    }
                    if ("VALOR".equals(tipoValor) && unidade.valor() != null && unidade.valor().compareTo(BigDecimal.ZERO) > 0) {
                        if (precoReferencia == null || unidade.valor().compareTo(precoReferencia) > 0) {
                            precoReferencia = unidade.valor();
                        }
                    }
                }
            }
        }

        if (precoReferencia == null) {
            precoReferencia = BigDecimal.ZERO;
        }
        return new PromptContexto(precoReferencia, possuiReservado);
    }

    private BigDecimal calcularPrecoReferenciaPorUnidades(List<Map<String, Object>> unidades) {
        if (unidades == null || unidades.isEmpty()) {
            return BigDecimal.ZERO;
        }

        BigDecimal maior = null;
        for (Map<String, Object> unidade : unidades) {
            Object precoObj = unidade.get("preco");
            BigDecimal preco = toBigDecimal(precoObj);
            if (preco != null && preco.compareTo(BigDecimal.ZERO) > 0) {
                if (maior == null || preco.compareTo(maior) > 0) {
                    maior = preco;
                }
            }
        }
        return maior == null ? BigDecimal.ZERO : maior;
    }

    private BigDecimal toBigDecimal(Object valor) {
        if (valor == null) {
            return null;
        }
        if (valor instanceof BigDecimal decimal) {
            return decimal;
        }
        if (valor instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        try {
            return new BigDecimal(valor.toString().trim());
        } catch (Exception ignored) {
            return null;
        }
    }

    private String mapearDisponibilidadeComercial(String tipoValor) {
        if (tipoValor == null) {
            return AI_UNKNOWN_VALUE;
        }
        return "RESERVADO".equalsIgnoreCase(tipoValor.trim())
                ? "EM_PROCESSO_DE_FECHAMENTO"
                : "DISPONIVEL";
    }

    private String removerColunasStatusDaTabelaMarkdown(String texto) {
        if (texto == null || texto.isBlank()) {
            return texto;
        }

        String[] linhas = texto.split("\\R", -1);
        for (int i = 0; i < linhas.length - 1; i++) {
            if (!isMarkdownTableRow(linhas[i]) || !isMarkdownSeparatorRow(linhas[i + 1])) {
                continue;
            }

            List<String> cabecalho = splitMarkdownRow(linhas[i]);
            Set<Integer> colunasParaRemover = new LinkedHashSet<>();
            for (int idx = 0; idx < cabecalho.size(); idx++) {
                String nomeColuna = normalizarTexto(cabecalho.get(idx));
                if (nomeColuna.contains("status") || nomeColuna.contains("disponibilidade para venda imediata")) {
                    colunasParaRemover.add(idx);
                }
            }

            if (colunasParaRemover.isEmpty()) {
                continue;
            }

            linhas[i] = joinMarkdownRow(removerColunas(cabecalho, colunasParaRemover));
            linhas[i + 1] = joinMarkdownSeparator(removerColunas(splitMarkdownRow(linhas[i + 1]), colunasParaRemover).size());

            int j = i + 2;
            while (j < linhas.length && isMarkdownTableRow(linhas[j])) {
                linhas[j] = joinMarkdownRow(removerColunas(splitMarkdownRow(linhas[j]), colunasParaRemover));
                j++;
            }
            i = j - 1;
        }

        return String.join("\n", linhas);
    }

    private String sanitizarRespostaFinal(String resposta) {
        if (resposta == null || resposta.isBlank()) {
            return resposta;
        }

        if (resposta.startsWith("Olá! Que alegria ver seu interesse neste empreendimento.")) {
            return resposta;
        }

        String sanitized = removerColunasStatusDaTabelaMarkdown(resposta);
        sanitized = removerColunasProibidasEmLinhasDelimitadas(sanitized, ",");
        sanitized = removerColunasProibidasEmLinhasDelimitadas(sanitized, ";");
        sanitized = removerColunasProibidasEmLinhasDelimitadas(sanitized, "\t");

        // Fallback final para não exibir os nomes das colunas proibidas em cabeçalhos.
        sanitized = sanitized.replaceAll("(?im)(\\||,|;|\\t)\\s*status\\s*(\\||,|;|\\t)", "$1");
        sanitized = sanitized.replaceAll("(?im)(\\||,|;|\\t)\\s*disponibilidade\\s+para\\s+venda\\s+imediata\\s*(\\||,|;|\\t)", "$1");
        sanitized = sanitizarMencoesBancarias(sanitized);
        sanitized = aplicarQuebraEntreTopicos(sanitized);

        return sanitized;
    }

    private String aplicarQuebraEntreTopicos(String texto) {
        if (texto == null || texto.isBlank()) {
            return texto;
        }

        String[] linhas = texto.split("\\R", -1);
        StringBuilder out = new StringBuilder();

        for (int i = 0; i < linhas.length; i++) {
            String atual = linhas[i];
            out.append(atual);
            if (i == linhas.length - 1) {
                continue;
            }

            String proxima = linhas[i + 1];
            boolean atualEhTopico = atual.matches("^\\s*(?:[-*+]\\s+.+|\\d+\\.\\s+.+)$");
            boolean proximaEhTopico = proxima.matches("^\\s*(?:[-*+]\\s+.+|\\d+\\.\\s+.+)$");
            boolean atualEhTabela = atual.contains("|");
            boolean proximaEhTabela = proxima.contains("|");

            if (atualEhTopico && proximaEhTopico && !atualEhTabela && !proximaEhTabela) {
                out.append("\n\n");
            } else {
                out.append("\n");
            }
        }

        return out.toString();
    }

    private String sanitizarMencoesBancarias(String texto) {
        if (texto == null || texto.isBlank()) {
            return texto;
        }

        String sanitized = texto;
        sanitized = sanitized.replaceAll("(?i)financiamento\\s+banc[aá]rio", "condição direta com a construtora");
        sanitized = sanitized.replaceAll("(?i)financiamento\\s+com\\s+banco", "condição direta com a construtora");
        sanitized = sanitized.replaceAll("(?i)cr[eé]dito\\s+imobili[aá]rio\\s+banc[aá]rio", "negociação direta com a construtora");
        sanitized = sanitized.replaceAll("(?i)aprova[cç][aã]o\\s+banc[aá]ria", "aprovação comercial da construtora");
        sanitized = sanitized.replaceAll("(?i)banco", "construtora");
        return sanitized;
    }

    private String removerColunasProibidasEmLinhasDelimitadas(String texto, String delimitador) {
        String[] linhas = texto.split("\\R", -1);
        String regexDelimitador = Pattern.quote(delimitador);

        for (int i = 0; i < linhas.length; i++) {
            String linha = linhas[i];
            if (linha == null || linha.isBlank() || !linha.contains(delimitador)) {
                continue;
            }

            List<String> colunasCabecalho = splitDelimitedRow(linha, regexDelimitador);
            if (colunasCabecalho.size() < 2) {
                continue;
            }

            Set<Integer> colunasParaRemover = indicesColunasProibidas(colunasCabecalho);
            if (colunasParaRemover.isEmpty() || !pareceCabecalhoTabela(colunasCabecalho)) {
                continue;
            }

            linhas[i] = joinDelimitedRow(removerColunas(colunasCabecalho, colunasParaRemover), delimitador);
            int j = i + 1;
            while (j < linhas.length && linhas[j] != null && !linhas[j].isBlank() && linhas[j].contains(delimitador)) {
                List<String> colunasLinha = splitDelimitedRow(linhas[j], regexDelimitador);
                if (colunasLinha.size() < 2) {
                    break;
                }
                linhas[j] = joinDelimitedRow(removerColunas(colunasLinha, colunasParaRemover), delimitador);
                j++;
            }
            i = j - 1;
        }

        return String.join("\n", linhas);
    }

    private Set<Integer> indicesColunasProibidas(List<String> colunas) {
        Set<Integer> indices = new LinkedHashSet<>();
        for (int idx = 0; idx < colunas.size(); idx++) {
            String coluna = normalizarTexto(colunas.get(idx));
            if (coluna.equals("status") || coluna.equals("disponibilidade para venda imediata")) {
                indices.add(idx);
            }
        }
        return indices;
    }

    private boolean pareceCabecalhoTabela(List<String> colunas) {
        String linha = colunas.stream()
                .map(this::normalizarTexto)
                .collect(java.util.stream.Collectors.joining(" "));
        return (linha.contains("unidade") || linha.contains("andar") || linha.contains("preco"))
                && (linha.contains("status") || linha.contains("disponibilidade para venda imediata"));
    }

    private boolean isMarkdownTableRow(String linha) {
        if (linha == null) {
            return false;
        }
        String trimmed = linha.trim();
        if (!trimmed.contains("|")) {
            return false;
        }
        return splitMarkdownRow(trimmed).size() >= 2;
    }

    private boolean isMarkdownSeparatorRow(String linha) {
        if (linha == null) {
            return false;
        }
        String cleaned = linha.replace("|", "").replace("-", "").replace(":", "").trim();
        return cleaned.isEmpty() && linha.contains("-");
    }

    private List<String> splitMarkdownRow(String linha) {
        String inner = linha.trim();
        if (inner.startsWith("|")) {
            inner = inner.substring(1);
        }
        if (inner.endsWith("|")) {
            inner = inner.substring(0, inner.length() - 1);
        }
        return java.util.Arrays.stream(inner.split("\\|", -1))
                .map(String::trim)
                .toList();
    }

    private List<String> splitDelimitedRow(String linha, String regexDelimitador) {
        return java.util.Arrays.stream(linha.split("\\s*" + regexDelimitador + "\\s*", -1))
                .map(String::trim)
                .toList();
    }

    private List<String> removerColunas(List<String> valores, Set<Integer> colunasParaRemover) {
        return java.util.stream.IntStream.range(0, valores.size())
                .filter(idx -> !colunasParaRemover.contains(idx))
                .mapToObj(valores::get)
                .toList();
    }

    private String joinMarkdownRow(List<String> colunas) {
        return "| " + String.join(" | ", colunas) + " |";
    }

    private String joinMarkdownSeparator(int quantidadeColunas) {
        return "| " + String.join(" | ", java.util.Collections.nCopies(Math.max(quantidadeColunas, 1), "---")) + " |";
    }

    private String joinDelimitedRow(List<String> colunas, String delimitador) {
        return String.join(delimitador + " ", colunas);
    }

    private boolean isPedidoProposta(String pergunta) {
        String normalized = normalizarTexto(pergunta);
        return normalized.contains("proposta");
    }

    private boolean isPedidoRefinamentoProposta(String pergunta) {
        String normalized = normalizarTexto(pergunta);
        return normalized.contains("melhore")
                || normalized.contains("melhorar")
                || normalized.contains("aprimor")
                || normalized.contains("refin")
                || normalized.contains("mais sofisticad")
                || normalized.contains("mais executiv")
                || normalized.contains("mais elegante")
                || normalized.contains("eleve o nivel")
                || normalized.contains("suba o nivel")
                || normalized.contains("deixe melhor")
                || normalized.contains("deixa melhor");
    }

    private List<IaInteracao> buscarInteracoesRecentesDoEmpreendimento(Long empresaId,
                                                                       Long usuarioId,
                                                                       Long empreendimentoId) {
        return iaInteracaoRepository
                .findTop20ByEmpresaIdAndUsuarioIdOrderByCreatedAtDesc(empresaId, usuarioId)
                .stream()
                .filter(item -> empreendimentoId.equals(item.getEmpreendimentoId()))
                .toList();
    }

    private String determinarPerfilProposta(BigDecimal valor) {
        if (valor == null || valor.compareTo(BigDecimal.ZERO) <= 0) {
            return "INDEFINIDO";
        }
        if (valor.compareTo(BigDecimal.valueOf(500_000)) <= 0) {
            return "ECONOMICO";
        }
        if (valor.compareTo(BigDecimal.valueOf(1_500_000)) <= 0) {
            return "MEDIO_PADRAO";
        }
        return "ALTO_PADRAO";
    }

    private String determinarEstiloRefinamento(int quantidadeInteracoesEmpreendimento) {
        int indice = Math.floorMod(quantidadeInteracoesEmpreendimento, 4);
        return switch (indice) {
            case 0 -> "ABORDAGEM CONSULTIVA PREMIUM";
            case 1 -> "ABORDAGEM DE OPORTUNIDADE E DESEJO";
            case 2 -> "ABORDAGEM EXECUTIVA E PATRIMONIAL";
            default -> "ABORDAGEM COMERCIAL SOFISTICADA E CALOROSA";
        };
    }

    private OpenAIService.OpenAIResult gerarPropostaViaIA(String pergunta,
                                                          EmpreendimentoSelecionado empreendimento,
                                                          UnidadeSolicitadaData unidade,
                                                          CondicoesTabelaVendas condicoes,
                                                          String perfil,
                                                          String nomeUsuario,
                                                          String respostaAnterior,
                                                          String estiloRefinamento) {
        boolean refinamento = respostaAnterior != null && !respostaAnterior.isBlank();
        String systemPrompt = refinamento
                ? iaPromptFactory.buildRefinamentoPropostaSystemPrompt()
                : iaPromptFactory.buildPropostaSystemPrompt();

        String valorFormatado = unidade.valor() == null
                ? "não tenho essa informação confirmada no momento"
                : NumberFormat.getCurrencyInstance(new Locale("pt", "BR")).format(unidade.valor());
        String primeiraParcelaEstimada = calcularPrimeiraParcelaEstimada(unidade.valor(), condicoes.saldoParcelas());
        String andarTexto = unidade.andar() == null ? "-" : unidade.andar() + "º";
        String tipoTexto = unidade.tipo() == null ? "-" : unidade.tipo().toString();

        String userPrompt = """
                <dados>
                nome_usuario: %s
                empreendimento: %s
                perfil: %s
                unidade: %s
                pavimento: %s
                tipo: %s
                valor: %s
                condicao_unidade: %s
                entrada_tabela: %s
                parcelas_tabela: %s
                saldo_parcelas: %s
                primeira_parcela_estimada: %s
                reforcos_tabela: %s
                pergunta_original: %s
                </dados>

                Estrutura esperada:
                1) abertura comercial adaptada ao perfil
                2) tabela markdown da unidade
                3) bloco textual EXATAMENTE com esta ideia (adaptando apenas os valores):
                   "Preparamos uma condição especial para facilitar a sua conquista! Veja como o seu sonho cabe no orçamento:"
                   "- Entrada Facilitada: ..."
                   "- Parcelas Mensais: ..."
                   "- Primeira Parcela Estimada: ... (sujeita ao índice CUB)"
                   "- Reforços Anuais: ..."
                   "Essa é a oportunidade que você esperava para garantir as chaves do seu novo lar com total segurança financeira."
                4) aviso obrigatório e explícito sobre reajuste pelo índice CUB.
                5) fechamento com CTA comercial.
                """.formatted(
                safeForAi(nomeUsuario),
                safeForAi(empreendimento.nome()),
                safeForAi(perfil),
                safeForAi(unidade.unidade()),
                safeForAi(andarTexto),
                safeForAi(tipoTexto),
                safeForAi(valorFormatado),
                "RESERVADO".equalsIgnoreCase(unidade.tipoValor()) ? "Em reserva" : "Disponível",
                safeForAi(condicoes.entrada()),
                safeForAi(condicoes.parcelasMensais()),
                safeForAi(condicoes.saldoParcelas() == null ? null : String.valueOf(condicoes.saldoParcelas())),
                safeForAi(primeiraParcelaEstimada),
                safeForAi(condicoes.reforcosAnuais()),
                safeForAi(pergunta)
        );

        if (refinamento) {
            userPrompt = userPrompt + """

                    Refinamento obrigatório:
                    - reescreva a proposta anterior por completo, em vez de apenas trocar palavras
                    - entregue uma versão claramente superior em impacto comercial
                    - preserve rigorosamente os mesmos dados, valores e condições
                    - crie uma nova abertura mais forte e memorável
                    - crie uma argumentação mais desejável, consultiva e convincente
                    - crie um fechamento mais vendedor, com CTA mais nobre e mais direto
                    - a nova versão deve parecer uma peça comercial de nível acima da anterior
                    - preserve clareza, elegância e profissionalismo
                    - use obrigatoriamente esta nova linha criativa nesta versão: %s
                    - não reutilize a mesma primeira frase da versão anterior
                    - não reutilize a mesma sequência de subtítulos da versão anterior
                    - a diferença entre a versão nova e a anterior deve ser perceptível logo na abertura

                    <proposta_anterior>
                    %s
                    </proposta_anterior>
                    """.formatted(safeForAi(estiloRefinamento), safeForAi(respostaAnterior));
        }

        OpenAIService.OpenAIResult result = perguntarComFallbackPorLimite(systemPrompt, userPrompt);
        String respostaComAviso = garantirPrimeiraParcelaEReajusteCub(result.resposta(), primeiraParcelaEstimada);
        return new OpenAIService.OpenAIResult(respostaComAviso, result.totalTokens());
    }

    private String calcularPrimeiraParcelaEstimada(BigDecimal valorUnidade, Integer saldoParcelas) {
        if (valorUnidade == null || saldoParcelas == null || saldoParcelas <= 0) {
            return CondicoesTabelaVendas.UNKNOWN;
        }
        BigDecimal primeiraParcela = valorUnidade.divide(BigDecimal.valueOf(saldoParcelas), 2, java.math.RoundingMode.HALF_UP);
        return NumberFormat.getCurrencyInstance(new Locale("pt", "BR")).format(primeiraParcela);
    }

    private String garantirPrimeiraParcelaEReajusteCub(String resposta, String primeiraParcelaEstimada) {
        if (resposta == null || resposta.isBlank()) {
            return resposta;
        }

        String normalized = normalizarTexto(resposta);
        boolean temAvisoCub = normalized.contains("cub") && normalized.contains("reajuste");
        boolean temPrimeiraParcela = normalized.contains("primeira parcela");

        if (temAvisoCub && temPrimeiraParcela) {
            return resposta;
        }

        StringBuilder complemento = new StringBuilder();
        if (!temPrimeiraParcela) {
            complemento.append("\n\n")
                    .append("- **Primeira Parcela Estimada:** ")
                    .append(safeForAi(primeiraParcelaEstimada))
                    .append(" (valor de referência calculado por valor da unidade / saldo de parcelas; sujeito ao índice CUB).");
        }

        if (!temAvisoCub) {
            complemento.append("\n\n")
                    .append("**Condição Importante:** Os valores e parcelas apresentados estão sujeitos a reajuste periódico conforme o índice CUB.");
        }

        return resposta + complemento;
    }

    private OpenAIService.OpenAIResult perguntarComFallbackPorLimite(String systemPrompt, String userPrompt) {
        return perguntaComFallbackPorLimite(systemPrompt, userPrompt, null);
    }

    private OpenAIService.OpenAIResult perguntaComFallbackPorLimite(String systemPrompt,
                                                                    String userPrompt,
                                                                    Integer customMaxOutputTokens) {
        try {
            return customMaxOutputTokens == null
                    ? openAIService.perguntar(systemPrompt, userPrompt)
                    : openAIService.perguntar(systemPrompt, userPrompt, customMaxOutputTokens);
        } catch (BadRequestException ex) {
            String reason = ex.getReason();
            if (reason == null || !reason.toLowerCase(Locale.ROOT).contains(TOKEN_LIMIT_ERROR_SNIPPET)) {
                throw ex;
            }

            String systemPromptEnxuto = iaPromptFactory.appendConcisionFallback(systemPrompt);

            String userPromptEnxuto = userPrompt + """

                    A resposta anterior excedeu o limite.
                    Responda agora de forma objetiva e compacta, preservando apenas os pontos comerciais essenciais.
                    """;

            return customMaxOutputTokens == null
                    ? openAIService.perguntar(systemPromptEnxuto, userPromptEnxuto)
                    : openAIService.perguntar(systemPromptEnxuto, userPromptEnxuto);
        }
    }

    private UnidadeSolicitadaData toUnidadeSolicitadaData(PropostaEconomicaData proposta, String tipoValor) {
        return new UnidadeSolicitadaData(
                proposta.unidade(),
                proposta.andar(),
                proposta.tipo(),
                tipoValor,
                proposta.valor()
        );
    }

    private Optional<PropostaEconomicaData> buscarPropostaPorFaixa(Long empresaId,
                                                                    Long empreendimentoIdSelecionado,
                                                                    String pergunta,
                                                                    BigDecimal valorMinimo,
                                                                    BigDecimal valorMaximo,
                                                                    boolean incluirLimiteInferior) {
        try {
            EmpreendimentoSelecionado empreendimentoSelecionado = resolverEmpreendimentoSelecionado(
                    empresaId,
                    empreendimentoIdSelecionado,
                    pergunta
            );
            Integer andarSolicitado = extrairNumeroPorPadrao(pergunta, "(?i)(pavimento|andar)\\s*(\\d{1,3})");
            Integer tipoSolicitado = extrairNumeroPorPadrao(pergunta, "(?i)tipo\\s*(\\d{1,3})");

            List<PropostaEconomicaData> unidades = jdbcTemplate.query(
                    """
                    SELECT tu.codigo_unidade, tu.valor, t.titulo
                    FROM empreendimento_tipo_unidade tu
                    INNER JOIN empreendimento_tipo t ON t.id = tu.tipo_id
                    INNER JOIN empreendimento e ON e.id = t.empreendimento_id
                    WHERE e.empresa_id = ?
                      AND e.id = ?
                      AND UPPER(tu.tipo_valor) = 'VALOR'
                      AND tu.valor IS NOT NULL
                      AND tu.valor > 0
                      AND tu.valor <= ?
                    ORDER BY tu.valor ASC, tu.codigo_unidade ASC
                    """,
                    (rs, rowNum) -> {
                        String unidade = rs.getString("codigo_unidade");
                        BigDecimal valor = rs.getBigDecimal("valor");
                        String tipoTitulo = rs.getString("titulo");
                        Integer andar = parseAndarAsInteger(extrairAndar(unidade));
                        Integer tipo = extrairNumeroPorPadrao(tipoTitulo, "(?i)tipo\\s*(\\d+)");
                        return new PropostaEconomicaData(unidade, andar, valor, tipo);
                    },
                    empresaId, empreendimentoSelecionado.id(), valorMaximo
            );

            return unidades.stream()
                    .filter(item -> item.valor() != null)
                    .filter(item -> incluirLimiteInferior
                            ? item.valor().compareTo(valorMinimo) >= 0
                            : item.valor().compareTo(valorMinimo) > 0)
                    .filter(item -> andarSolicitado == null || andarSolicitado.equals(item.andar()))
                    .filter(item -> tipoSolicitado == null || tipoSolicitado.equals(item.tipo()))
                    .findFirst();
        } catch (Exception ignored) {
            return Optional.empty();
        }
    }

    private Optional<UnidadeSolicitadaData> buscarUnidadeSolicitada(Long empresaId,
                                                                    Long empreendimentoIdSelecionado,
                                                                    String pergunta) {
        Integer andarSolicitado = extrairNumeroPorPadrao(pergunta, "(?i)(pavimento|andar)\\s*(\\d{1,3})");
        Integer tipoSolicitado = extrairNumeroPorPadrao(pergunta, "(?i)tipo\\s*(\\d{1,3})");
        if (andarSolicitado == null && tipoSolicitado == null) {
            return Optional.empty();
        }

        EmpreendimentoSelecionado empreendimento = resolverEmpreendimentoSelecionado(
                empresaId,
                empreendimentoIdSelecionado,
                pergunta
        );

        List<UnidadeSolicitadaData> resultados = jdbcTemplate.query(
                """
                SELECT tu.codigo_unidade, tu.tipo_valor, tu.valor, t.titulo
                FROM empreendimento_tipo_unidade tu
                INNER JOIN empreendimento_tipo t ON t.id = tu.tipo_id
                INNER JOIN empreendimento e ON e.id = t.empreendimento_id
                WHERE e.empresa_id = ?
                  AND e.id = ?
                """,
                (rs, rowNum) -> {
                    String codigoUnidade = rs.getString("codigo_unidade");
                    Integer andar = parseAndarAsInteger(extrairAndar(codigoUnidade));
                    Integer tipo = extrairNumeroPorPadrao(rs.getString("titulo"), "(?i)tipo\\s*(\\d+)");
                    return new UnidadeSolicitadaData(
                            codigoUnidade,
                            andar,
                            tipo,
                            rs.getString("tipo_valor"),
                            rs.getBigDecimal("valor")
                    );
                },
                empresaId, empreendimento.id()
        );

        return resultados.stream()
                .filter(item -> andarSolicitado == null || andarSolicitado.equals(item.andar()))
                .filter(item -> tipoSolicitado == null || tipoSolicitado.equals(item.tipo()))
                .findFirst();
    }

    private CondicoesTabelaVendas buscarCondicoesTabelaVendas(Long empresaId, Long empreendimentoIdSelecionado) {
        return jdbcTemplate.query(
                """
                SELECT entrada_valor, saldo_pagamento, reforcos_pagamento
                FROM empreendimento
                WHERE empresa_id = ?
                  AND id = ?
                LIMIT 1
                """,
                rs -> {
                    if (!rs.next()) {
                        return CondicoesTabelaVendas.defaultValues();
                    }

                    BigDecimal entradaValor = rs.getBigDecimal("entrada_valor");
                    String saldoPagamento = rs.getString("saldo_pagamento");
                    String reforcosPagamento = rs.getString("reforcos_pagamento");

                    String entrada = entradaValor == null
                            ? CondicoesTabelaVendas.UNKNOWN
                            : NumberFormat.getCurrencyInstance(new Locale("pt", "BR")).format(entradaValor);
                    String parcelas = (saldoPagamento == null || saldoPagamento.isBlank())
                            ? CondicoesTabelaVendas.UNKNOWN
                            : saldoPagamento.trim();
                    Integer saldoParcelas = extrairSaldoParcelas(saldoPagamento);
                    String reforcos = extrairQuantidadeReforcos(reforcosPagamento);

                    return new CondicoesTabelaVendas(entrada, parcelas, reforcos, saldoParcelas);
                },
                empresaId,
                empreendimentoIdSelecionado
        );
    }

    private Integer extrairSaldoParcelas(String saldoPagamento) {
        if (saldoPagamento == null || saldoPagamento.isBlank()) {
            return null;
        }
        Matcher matcher = Pattern.compile("(\\d{1,4})").matcher(saldoPagamento);
        if (!matcher.find()) {
            return null;
        }
        try {
            return Integer.parseInt(matcher.group(1));
        } catch (Exception ignored) {
            return null;
        }
    }

    private String extrairQuantidadeReforcos(String reforcosPagamento) {
        if (reforcosPagamento == null || reforcosPagamento.isBlank()) {
            return CondicoesTabelaVendas.UNKNOWN;
        }
        Matcher matcher = Pattern.compile("(\\d{1,3})").matcher(reforcosPagamento);
        if (matcher.find()) {
            return matcher.group(1) + " reforços";
        }
        return reforcosPagamento.trim();
    }

    private Integer extrairNumeroPorPadrao(String texto, String regex) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        Matcher matcher = Pattern.compile(regex).matcher(texto);
        if (!matcher.find()) {
            return null;
        }
        try {
            String valor = matcher.groupCount() >= 2 ? matcher.group(2) : matcher.group(1);
            return Integer.parseInt(valor);
        } catch (Exception ignored) {
            return null;
        }
    }

    private Integer parseAndarAsInteger(String andar) {
        if (andar == null || andar.isBlank()) {
            return null;
        }
        try {
            return Integer.parseInt(andar);
        } catch (Exception ignored) {
            return null;
        }
    }

    private ContextoEstaticoEmpreendimento obterContextoEstaticoEmpreendimento(Long empresaId, Long empreendimentoIdSelecionado) {
        if (empreendimentoIdSelecionado == null) {
            throw new BadRequestException("Selecione um empreendimento para continuar");
        }

        IaContextCacheService.ContextoEstaticoCacheData cache = iaContextCacheService
                .getContextoEstatico(empresaId, empreendimentoIdSelecionado)
                .orElseGet(() -> {
                    List<EmpreendimentoDtos.EmpreendimentoResponse> empreendimentos = empreendimentoService.list();
                    List<EmpreendimentoDtos.EmpreendimentoResponse> empreendimentosFiltrados = filtrarEmpreendimentos(empreendimentos, empreendimentoIdSelecionado);
                    if (empreendimentosFiltrados.isEmpty()) {
                        throw new BadRequestException("Empreendimento inválido para a sessão atual");
                    }
                    List<MaterialDtos.MaterialResponse> materiaisFiltrados = filtrarMateriais(materialService.list(), empreendimentoIdSelecionado);
                    PromptContexto promptContexto = extrairPromptContextoDosEmpreendimentos(empreendimentosFiltrados);
                    List<Map<String, Object>> inventarioTabela = buildInventarioTabelaCanonica(empreendimentosFiltrados);

                    IaContextCacheService.ContextoEstaticoCacheData loaded = new IaContextCacheService.ContextoEstaticoCacheData(
                            empreendimentosFiltrados,
                            materiaisFiltrados,
                            inventarioTabela,
                            promptContexto.precoReferencia(),
                            promptContexto.possuiReservado()
                    );
                    iaContextCacheService.putContextoEstatico(empresaId, empreendimentoIdSelecionado, loaded);
                    return loaded;
                });

        return new ContextoEstaticoEmpreendimento(
                cache.empreendimentosFiltrados(),
                cache.materiaisFiltrados(),
                cache.inventarioTabela(),
                cache.precoReferencia(),
                cache.possuiReservado()
        );
    }

    private String buildConsolidatedContextJson(Long empresaId,
                                                String pergunta,
                                                String tipoRespostaEsperada,
                                                Long empreendimentoIdSelecionado,
                                                List<EmpreendimentoDtos.EmpreendimentoResponse> empreendimentos,
                                                List<MaterialDtos.MaterialResponse> materiais,
                                                List<Map<String, Object>> inventarioTabela,
                                                List<IaInteracao> memoriaUsuario,
                                                String nomeUsuario) {
        Map<String, Object> context = new LinkedHashMap<>();
        context.put("schemaVersion", "2.0");
        context.put("contextoTipo", "GERAL");
        context.put("empresaId", empresaId);
        context.put("empreendimentoSelecionadoId", empreendimentoIdSelecionado);
        context.put("perguntaAtual", pergunta);
        context.put("nomeUsuario", safeForAi(nomeUsuario));
        context.put("tipoRespostaEsperada", tipoRespostaEsperada);
        context.put("memoriaCurta", memoriaUsuario == null ? List.of() : memoriaUsuario.stream()
                .sorted(Comparator.comparing(IaInteracao::getCreatedAt))
                .limit(5)
                .map(item -> Map.of(
                        "pergunta", blank(item.getPergunta()),
                        "resposta", blank(item.getResposta())
                ))
                .toList());
        context.put("EMPREENDIMENTO", empreendimentos);
        context.put("INVENTARIO_TABELA", inventarioTabela == null ? List.of() : inventarioTabela);
        context.put("MATERIAIS", materiais);
        Map<String, Object> simulacaoFinanceira = new LinkedHashMap<>();
        simulacaoFinanceira.put("entrada", Map.of("valor", AI_UNKNOWN_VALUE, "fonte", "TABELA_PADRAO"));
        simulacaoFinanceira.put("mensais", Map.of("descricao", AI_UNKNOWN_VALUE, "fonte", "TABELA_PADRAO"));
        simulacaoFinanceira.put("reforcos", Map.of("descricao", AI_UNKNOWN_VALUE, "fonte", "TABELA_PADRAO"));
        simulacaoFinanceira.put("juros", Map.of("descricao", AI_UNKNOWN_VALUE));
        simulacaoFinanceira.put("observacao", "Quando o back-end calcular uma simulação específica, este bloco deve prevalecer sobre a condição padrão da tabela.");
        context.put("SIMULACAO_FINANCEIRA", simulacaoFinanceira);

        try {
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(sanitizeForAi(context));
        } catch (JsonProcessingException ex) {
            throw new BadRequestException("Falha ao montar o contexto da IA");
        }
    }

    private List<Map<String, Object>> buildInventarioTabelaCanonica(List<EmpreendimentoDtos.EmpreendimentoResponse> empreendimentos) {
        if (empreendimentos == null || empreendimentos.isEmpty()) {
            return List.of();
        }

        List<Map<String, Object>> rows = new java.util.ArrayList<>();
        for (EmpreendimentoDtos.EmpreendimentoResponse empreendimento : empreendimentos) {
            if (empreendimento.tipos() == null) {
                continue;
            }
            for (EmpreendimentoDtos.TipoResponse tipo : empreendimento.tipos()) {
                if (tipo.unidades() == null) {
                    continue;
                }
                Integer tipoNumero = extrairNumeroPorPadrao(tipo.titulo(), "(?i)tipo\\s*(\\d+)");
                for (EmpreendimentoDtos.TipoUnidadeResponse unidade : tipo.unidades()) {
                    String codigo = unidade.codigoUnidade();
                    String tipoValor = unidade.tipoValor();
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("empreendimentoId", empreendimento.id());
                    row.put("empreendimentoNome", empreendimento.nome());
                    row.put("unidade", codigo);
                    row.put("andar", extrairAndar(codigo));
                    row.put("tipo", tipoNumero == null ? blank(tipo.titulo()) : tipoNumero);
                    row.put("preco", unidade.valor());
                    row.put("disponibilidadeComercial", mapearDisponibilidadeComercial(tipoValor));
                    row.put("metragem", tipo.areaMetragem());
                    row.put("suites", tipo.quantidadeSuites());
                    row.put("vagas", tipo.quantidadeVagas());
                    rows.add(row);
                }
            }
        }
        return rows;
    }

    private boolean isOutOfScopeQuestion(String pergunta) {
        String normalized = pergunta == null ? "" : pergunta.toLowerCase(Locale.ROOT);
        return normalized.contains("consulta médica")
                || normalized.contains("consultas médicas")
                || normalized.contains("médico")
                || normalized.contains("medico")
                || normalized.contains("hospital")
                || normalized.contains("remédio")
                || normalized.contains("remedio")
                || normalized.contains("psicólogo")
                || normalized.contains("psicologo")
                || normalized.contains("dentista")
                || normalized.contains("advogado")
                || normalized.contains("processo judicial")
                || normalized.contains("imposto de renda")
                || normalized.contains("apostar")
                || normalized.contains("loteria");
    }

    private String blank(String value) {
        return value == null ? "" : value;
    }

    private boolean isObjectiveQuestion(String pergunta) {
        String normalized = pergunta == null ? "" : pergunta.toLowerCase(Locale.ROOT).trim();
        return normalized.startsWith("qual ")
                || normalized.startsWith("quais ")
                || normalized.startsWith("quanto ")
                || normalized.startsWith("quantos ")
                || normalized.startsWith("status")
                || normalized.contains("qual o status")
                || normalized.contains("está disponível")
                || normalized.contains("ta disponível")
                || normalized.contains("tá disponível")
                || normalized.contains("qual unidade")
                || normalized.contains("qual pavimento")
                || normalized.contains("mais caro")
                || normalized.contains("mais barato");
    }

    private List<EmpreendimentoDtos.EmpreendimentoResponse> filtrarEmpreendimentos(
            List<EmpreendimentoDtos.EmpreendimentoResponse> empreendimentos,
            Long empreendimentoIdSelecionado
    ) {
        if (empreendimentoIdSelecionado == null) {
            return empreendimentos;
        }
        return empreendimentos.stream()
                .filter(item -> empreendimentoIdSelecionado.equals(item.id()))
                .toList();
    }

    private List<MaterialDtos.MaterialResponse> filtrarMateriais(
            List<MaterialDtos.MaterialResponse> materiais,
            Long empreendimentoIdSelecionado
    ) {
        if (empreendimentoIdSelecionado == null) {
            return materiais;
        }
        return materiais.stream()
                .filter(item -> empreendimentoIdSelecionado.equals(item.empreendimentoId()))
                .toList();
    }

    private record PromptContexto(
            BigDecimal precoReferencia,
            boolean possuiReservado
    ) {}

    private record ConsultaPrecoContexto(
            String contextoJson,
            BigDecimal precoReferencia,
            boolean possuiReservado,
            boolean perguntaObjetiva
    ) {}

    private record ContextoEstaticoEmpreendimento(
            List<EmpreendimentoDtos.EmpreendimentoResponse> empreendimentosFiltrados,
            List<MaterialDtos.MaterialResponse> materiaisFiltrados,
            List<Map<String, Object>> inventarioTabela,
            BigDecimal precoReferencia,
            boolean possuiReservado
    ) {}

    private record EmpreendimentoSelecionado(
            Long id,
            String nome
    ) {}

    private record PropostaEconomicaData(
            String unidade,
            Integer andar,
            BigDecimal valor,
            Integer tipo
    ) {}

    private record UnidadeSolicitadaData(
            String unidade,
            Integer andar,
            Integer tipo,
            String tipoValor,
            BigDecimal valor
    ) {}

    private record CondicoesTabelaVendas(
            String entrada,
            String parcelasMensais,
            String reforcosAnuais,
            Integer saldoParcelas
    ) {
        private static final String UNKNOWN = "não tenho essa informação confirmada no momento";

        private static CondicoesTabelaVendas defaultValues() {
            return new CondicoesTabelaVendas(UNKNOWN, UNKNOWN, UNKNOWN, null);
        }
    }
}
