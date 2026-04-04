package com.construtora.services;

import com.construtora.dtos.EmpreendimentoDtos;
import com.construtora.entities.Empreendimento;
import com.construtora.entities.EmpreendimentoArquivo;
import com.construtora.entities.EmpreendimentoLocalizacao;
import com.construtora.entities.EmpreendimentoTipo;
import com.construtora.entities.EmpreendimentoTipoUnidade;
import com.construtora.exceptions.NotFoundException;
import com.construtora.repositories.EmpreendimentoArquivoRepository;
import com.construtora.repositories.EmpreendimentoRepository;
import com.construtora.repositories.MaterialRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

@Service
public class EmpreendimentoService {

    private final EmpreendimentoRepository empreendimentoRepository;
    private final EmpreendimentoArquivoRepository empreendimentoArquivoRepository;
    private final MaterialRepository materialRepository;
    private final CurrentSessionService currentSessionService;
    private final FileStorageService fileStorageService;
    private final AuditService auditService;

    public EmpreendimentoService(EmpreendimentoRepository empreendimentoRepository,
                                 EmpreendimentoArquivoRepository empreendimentoArquivoRepository,
                                 MaterialRepository materialRepository,
                                 CurrentSessionService currentSessionService,
                                 FileStorageService fileStorageService,
                                 AuditService auditService) {
        this.empreendimentoRepository = empreendimentoRepository;
        this.empreendimentoArquivoRepository = empreendimentoArquivoRepository;
        this.materialRepository = materialRepository;
        this.currentSessionService = currentSessionService;
        this.fileStorageService = fileStorageService;
        this.auditService = auditService;
    }

    @Transactional
    public EmpreendimentoDtos.EmpreendimentoResponse create(EmpreendimentoDtos.CreateEmpreendimentoRequest request) {
        return create(request, null, Map.of());
    }

    @Transactional
    public EmpreendimentoDtos.EmpreendimentoResponse create(EmpreendimentoDtos.CreateEmpreendimentoRequest request,
                                                            MultipartFile fotoPerfil) {
        return create(request, fotoPerfil, Map.of());
    }

    @Transactional
    public EmpreendimentoDtos.EmpreendimentoResponse create(EmpreendimentoDtos.CreateEmpreendimentoRequest request,
                                                            MultipartFile fotoPerfil,
                                                            Map<String, MultipartFile> multipartFiles) {
        validateTipos(request.tipos());
        String fotoPerfilUrl = request.fotoPerfilUrl();
        if (fotoPerfil != null && !fotoPerfil.isEmpty()) {
            FileStorageService.StoredFile stored = fileStorageService.upload(currentSessionService.empresaId(), "empreendimentos/perfil", fotoPerfil);
            fotoPerfilUrl = stored.url();
        }

        Empreendimento e = empreendimentoRepository.save(Empreendimento.builder()
                .empresaId(currentSessionService.empresaId())
                .nome(request.nome())
                .descricao(request.descricao())
                .metragemLazer(request.metragemLazer())
                .descricaoLazer(request.descricaoLazer())
                .percentualObra(request.percentualObra())
                .entradaTipo(normalizeEntradaTipo(request.entradaTipo()))
                .entradaValor(request.entradaValor())
                .saldoPagamento(normalizeText(request.saldoPagamento()))
                .reforcosPagamento(normalizeText(request.reforcosPagamento()))
                .dataInicioObra(request.dataInicioObra())
                .dataEntrega(request.dataEntrega())
                .fotoPerfilUrl(fotoPerfilUrl)
                .publicToken(generatePublicToken())
                .build());
        applyLocalizacao(e, request.localizacao());
        applyTipos(e, request.tipos(), extractTipoImageUrls(multipartFiles));
        empreendimentoRepository.save(e);
        return toResponse(e);
    }

    @Transactional(readOnly = true)
    public List<EmpreendimentoDtos.EmpreendimentoResponse> list() {
        Long empresaId = currentSessionService.empresaId();
        return empreendimentoRepository.findByEmpresaId(empresaId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public EmpreendimentoDtos.EmpreendimentoResponse update(Long id,
                                                            EmpreendimentoDtos.UpdateEmpreendimentoRequest request,
                                                            HttpServletRequest httpRequest) {
        return update(id, request, null, Map.of(), httpRequest);
    }

    @Transactional
    public EmpreendimentoDtos.EmpreendimentoResponse update(Long id,
                                                            EmpreendimentoDtos.UpdateEmpreendimentoRequest request,
                                                            MultipartFile fotoPerfil,
                                                            Map<String, MultipartFile> multipartFiles,
                                                            HttpServletRequest httpRequest) {
        validateTipos(request.tipos());
        Empreendimento e = empreendimentoRepository.findByIdAndEmpresaId(id, currentSessionService.empresaId())
                .orElseThrow(() -> new NotFoundException("Empreendimento não encontrado"));

        e.setNome(request.nome());
        e.setDescricao(request.descricao());
        String fotoPerfilUrl = request.fotoPerfilUrl();
        if (fotoPerfil != null && !fotoPerfil.isEmpty()) {
            FileStorageService.StoredFile stored = fileStorageService.upload(currentSessionService.empresaId(), "empreendimentos/perfil", fotoPerfil);
            fotoPerfilUrl = stored.url();
        }
        e.setFotoPerfilUrl(fotoPerfilUrl);
        e.setMetragemLazer(request.metragemLazer());
        e.setDescricaoLazer(request.descricaoLazer());
        e.setPercentualObra(request.percentualObra());
        e.setEntradaTipo(normalizeEntradaTipo(request.entradaTipo()));
        e.setEntradaValor(request.entradaValor());
        e.setSaldoPagamento(normalizeText(request.saldoPagamento()));
        e.setReforcosPagamento(normalizeText(request.reforcosPagamento()));
        e.setDataInicioObra(request.dataInicioObra());
        e.setDataEntrega(request.dataEntrega());
        applyLocalizacao(e, request.localizacao());
        applyTipos(e, request.tipos(), extractTipoImageUrls(multipartFiles));
        if (e.getPublicToken() == null || e.getPublicToken().isBlank()) {
            e.setPublicToken(generatePublicToken());
        }
        empreendimentoRepository.save(e);

        auditService.log("UPDATE_DEVELOPMENT", "EMPREENDIMENTO", e.getId(), httpRequest.getRemoteAddr());
        return toResponse(e);
    }

    @Transactional
    public EmpreendimentoDtos.EmpreendimentoArquivoResponse uploadArquivo(Long empreendimentoId,
                                                                          MultipartFile file,
                                                                          HttpServletRequest httpRequest) {
        Long empresaId = currentSessionService.empresaId();
        Empreendimento empreendimento = empreendimentoRepository.findByIdAndEmpresaId(empreendimentoId, empresaId)
                .orElseThrow(() -> new NotFoundException("Empreendimento não encontrado"));

        FileStorageService.StoredFile stored = fileStorageService.upload(empresaId, "empreendimentos", file);

        EmpreendimentoArquivo arquivo = empreendimentoArquivoRepository.save(EmpreendimentoArquivo.builder()
                .empresaId(empresaId)
                .empreendimento(empreendimento)
                .url(stored.url())
                .tipo(stored.contentType())
                .tamanhoBytes(stored.size())
                .build());

        auditService.log("UPLOAD_DEVELOPMENT_FILE", "EMPREENDIMENTO_ARQUIVO", arquivo.getId(), httpRequest.getRemoteAddr());
        return new EmpreendimentoDtos.EmpreendimentoArquivoResponse(
                arquivo.getId(),
                arquivo.getUrl(),
                arquivo.getTipo(),
                arquivo.getTamanhoBytes(),
                arquivo.getDataUpload()
        );
    }

    @Transactional
    public void delete(Long id, HttpServletRequest httpRequest) {
        Long empresaId = currentSessionService.empresaId();
        Empreendimento empreendimento = empreendimentoRepository.findByIdAndEmpresaId(id, empresaId)
                .orElseThrow(() -> new NotFoundException("Empreendimento não encontrado"));

        materialRepository.deleteAllByEmpresaIdAndEmpreendimentoId(empresaId, id);
        empreendimentoArquivoRepository.deleteByEmpresaIdAndEmpreendimentoId(empresaId, id);
        empreendimentoRepository.delete(empreendimento);

        auditService.log("DELETE_DEVELOPMENT", "EMPREENDIMENTO", empreendimento.getId(), httpRequest.getRemoteAddr());
    }

    @Transactional
    public EmpreendimentoDtos.EmpreendimentoResponse reajustarValores(Long id,
                                                                      EmpreendimentoDtos.ReajusteValoresRequest request,
                                                                      HttpServletRequest httpRequest) {
        Empreendimento empreendimento = empreendimentoRepository.findByIdAndEmpresaId(id, currentSessionService.empresaId())
                .orElseThrow(() -> new NotFoundException("Empreendimento não encontrado"));

        String tipo = request.tipo().trim().toUpperCase();
        BigDecimal valor = request.valor();

        for (EmpreendimentoTipo tipoEmpreendimento : empreendimento.getTipos()) {
            for (EmpreendimentoTipoUnidade unidade : tipoEmpreendimento.getUnidades()) {
                if (!"VALOR".equalsIgnoreCase(unidade.getTipoValor())) {
                    continue;
                }
                BigDecimal valorAtual = unidade.getValor();
                if (valorAtual == null) {
                    continue;
                }

                BigDecimal novoValor;
                if ("PERCENTUAL".equals(tipo)) {
                    BigDecimal fator = BigDecimal.ONE.add(valor.divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP));
                    novoValor = valorAtual.multiply(fator);
                } else if ("VALOR_FIXO".equals(tipo)) {
                    novoValor = valorAtual.add(valor);
                } else {
                    throw new ResponseStatusException(BAD_REQUEST, "Tipo de reajuste inválido");
                }

                if (novoValor.compareTo(BigDecimal.ZERO) < 0) {
                    novoValor = BigDecimal.ZERO;
                }

                unidade.setValor(novoValor.setScale(2, RoundingMode.HALF_UP));
            }
        }

        empreendimento.setDataReferenciaTabelaVendas(request.dataReferenciaTabelaVendas());
        empreendimentoRepository.save(empreendimento);
        auditService.log("ADJUST_DEVELOPMENT_VALUES", "EMPREENDIMENTO", empreendimento.getId(), httpRequest.getRemoteAddr());
        return toResponse(empreendimento);
    }

    private void validateTipos(List<EmpreendimentoDtos.TipoRequest> tipos) {
        if (tipos == null || tipos.isEmpty()) {
            return;
        }

        for (int tipoIndex = 0; tipoIndex < tipos.size(); tipoIndex++) {
            var tipo = tipos.get(tipoIndex);
            Map<String, Integer> unidades = new HashMap<>();
            if (tipo.unidades() == null) {
                continue;
            }

            for (int unidadeIndex = 0; unidadeIndex < tipo.unidades().size(); unidadeIndex++) {
                var unidade = tipo.unidades().get(unidadeIndex);
                String codigoNormalizado = unidade.codigoUnidade().trim().toLowerCase();
                Integer existingUnidade = unidades.putIfAbsent(codigoNormalizado, unidadeIndex);
                if (existingUnidade != null) {
                    throw new ResponseStatusException(BAD_REQUEST,
                            "Os pavimentos de um mesmo tipo não podem ter códigos duplicados");
                }
            }
        }
    }

    private EmpreendimentoDtos.EmpreendimentoResponse toResponse(Empreendimento e) {
        if (e.getPublicToken() == null || e.getPublicToken().isBlank()) {
            e.setPublicToken(generatePublicToken());
            empreendimentoRepository.save(e);
        }

        Long empresaId = currentSessionService.empresaId();
        List<EmpreendimentoDtos.EmpreendimentoArquivoResponse> arquivos =
                empreendimentoArquivoRepository.findByEmpresaIdAndEmpreendimentoId(empresaId, e.getId()).stream()
                        .map(a -> new EmpreendimentoDtos.EmpreendimentoArquivoResponse(
                                a.getId(), a.getUrl(), a.getTipo(), a.getTamanhoBytes(), a.getDataUpload()
                        ))
                        .toList();

        EmpreendimentoDtos.LocalizacaoResponse localizacao = null;
        if (e.getLocalizacao() != null) {
            localizacao = new EmpreendimentoDtos.LocalizacaoResponse(
                    e.getLocalizacao().getCep(),
                    e.getLocalizacao().getLogradouro(),
                    e.getLocalizacao().getNumero(),
                    e.getLocalizacao().getComplemento(),
                    e.getLocalizacao().getBairro(),
                    e.getLocalizacao().getCidade(),
                    e.getLocalizacao().getEstado()
            );
        }

        return new EmpreendimentoDtos.EmpreendimentoResponse(
                e.getId(),
                e.getEmpresaId(),
                e.getPublicToken(),
                e.getNome(),
                e.getDescricao(),
                e.getFotoPerfilUrl(),
                localizacao,
                e.getTipos().stream()
                        .map(tipo -> new EmpreendimentoDtos.TipoResponse(
                                tipo.getTitulo(),
                                tipo.getAreaMetragem(),
                                tipo.getPlantaImagemUrl(),
                                tipo.getQuantidadeSuites(),
                                tipo.getQuantidadeVagas(),
                                tipo.getUnidades().stream()
                                        .map(unidade -> new EmpreendimentoDtos.TipoUnidadeResponse(
                                                unidade.getCodigoUnidade(),
                                                unidade.getTipoValor(),
                                                unidade.getValor()
                                        ))
                                        .toList()
                        ))
                        .toList(),
                e.getMetragemLazer(),
                e.getDescricaoLazer(),
                e.getPercentualObra(),
                new EmpreendimentoDtos.CondicoesPagamentoResponse(
                        e.getEntradaTipo(),
                        e.getEntradaValor(),
                        e.getSaldoPagamento(),
                        e.getReforcosPagamento()
                ),
                e.getDataInicioObra(),
                e.getDataReferenciaTabelaVendas(),
                e.getDataEntrega(),
                e.getDataCriacao(),
                arquivos
        );
    }

    private String normalizeEntradaTipo(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim().toUpperCase();
    }

    private String normalizeText(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private void applyLocalizacao(Empreendimento empreendimento, EmpreendimentoDtos.LocalizacaoRequest request) {
        EmpreendimentoLocalizacao localizacao = empreendimento.getLocalizacao();
        if (localizacao == null) {
            localizacao = EmpreendimentoLocalizacao.builder().empreendimento(empreendimento).build();
        }
        localizacao.setCep(request.cep());
        localizacao.setLogradouro(request.logradouro());
        localizacao.setNumero(request.numero());
        localizacao.setComplemento(request.complemento());
        localizacao.setBairro(request.bairro());
        localizacao.setCidade(request.cidade());
        localizacao.setEstado(request.estado().toUpperCase());
        empreendimento.setLocalizacao(localizacao);
    }

    private void applyTipos(Empreendimento empreendimento,
                            List<EmpreendimentoDtos.TipoRequest> tiposRequest,
                            Map<Integer, String> tipoImageUrls) {
        while (empreendimento.getTipos().size() > tiposRequest.size()) {
            empreendimento.getTipos().remove(empreendimento.getTipos().size() - 1);
        }

        for (int index = 0; index < tiposRequest.size(); index++) {
            EmpreendimentoDtos.TipoRequest tipoRequest = tiposRequest.get(index);
            EmpreendimentoTipo tipo;

            if (index < empreendimento.getTipos().size()) {
                tipo = empreendimento.getTipos().get(index);
            } else {
                tipo = EmpreendimentoTipo.builder()
                        .empreendimento(empreendimento)
                        .build();
                empreendimento.getTipos().add(tipo);
            }

            tipo.setTitulo("Tipo " + (index + 1));
            tipo.setAreaMetragem(tipoRequest.areaMetragem());
            tipo.setPlantaImagemUrl(tipoImageUrls.getOrDefault(index, tipoRequest.plantaImagemUrl()));
            tipo.setQuantidadeSuites(tipoRequest.quantidadeSuites());
            tipo.setQuantidadeVagas(tipoRequest.quantidadeVagas());

            applyUnidades(tipo, tipoRequest.unidades());
        }
    }

    private void applyUnidades(EmpreendimentoTipo tipo,
                               List<EmpreendimentoDtos.TipoUnidadeRequest> unidadesRequest) {
        tipo.getUnidades().clear();

        for (EmpreendimentoDtos.TipoUnidadeRequest unidadeRequest : unidadesRequest) {
            String tipoValor = unidadeRequest.tipoValor().trim().toUpperCase();
            BigDecimal valor = unidadeRequest.valor();
            if (!"VALOR".equals(tipoValor) && !"RESERVADO".equals(tipoValor)) {
                throw new ResponseStatusException(BAD_REQUEST, "Tipo de valor inválido para pavimento");
            }
            if ("VALOR".equals(tipoValor)) {
                if (valor == null || valor.compareTo(BigDecimal.ZERO) <= 0) {
                    throw new ResponseStatusException(BAD_REQUEST, "Informe um valor monetário válido para o pavimento");
                }
            } else {
                valor = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            }

            tipo.getUnidades().add(EmpreendimentoTipoUnidade.builder()
                    .tipo(tipo)
                    .codigoUnidade(unidadeRequest.codigoUnidade())
                    .tipoValor(tipoValor)
                    .valor(valor)
                    .build());
        }
    }

    private Map<Integer, String> extractTipoImageUrls(Map<String, MultipartFile> multipartFiles) {
        Map<Integer, String> urls = new HashMap<>();
        for (Map.Entry<String, MultipartFile> entry : multipartFiles.entrySet()) {
            String key = entry.getKey();
            if (!key.startsWith("tipoImagem_")) continue;
            MultipartFile file = entry.getValue();
            if (file == null || file.isEmpty()) continue;

            int index = Integer.parseInt(key.substring("tipoImagem_".length()));
            FileStorageService.StoredFile stored = fileStorageService.upload(currentSessionService.empresaId(), "empreendimentos/tipos", file);
            urls.put(index, stored.url());
        }
        return urls;
    }

    private String generatePublicToken() {
        return UUID.randomUUID().toString().replace("-", "");
    }
}
