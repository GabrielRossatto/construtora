package com.construtora.services;

import com.construtora.dtos.IaDtos;
import com.construtora.exceptions.BadRequestException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class IntentClassifierService {

    private static final Pattern INTENCAO_PATTERN = Pattern.compile("\"intencao\"\\s*:\\s*\"([A-Z_]+)\"");

    private final OpenAIService openAIService;
    private final ObjectMapper objectMapper;

    public IntentClassifierService(OpenAIService openAIService, ObjectMapper objectMapper) {
        this.openAIService = openAIService;
        this.objectMapper = objectMapper;
    }

    public IaDtos.ClassificacaoIntencaoResponseDTO classificarIntencao(String pergunta) {
        String perguntaNormalizada = pergunta == null ? "" : pergunta.trim();
        if (perguntaNormalizada.isBlank()) {
            throw new BadRequestException("Pergunta é obrigatória");
        }

        Optional<IaDtos.IntencaoIA> intencaoHeuristica = classificarPorHeuristica(perguntaNormalizada);
        if (intencaoHeuristica.isPresent()) {
            return new IaDtos.ClassificacaoIntencaoResponseDTO(intencaoHeuristica.get());
        }

        String systemPrompt = """
                Você é um classificador de intenção para um CRM de construtora.
                Sua saída deve ser SOMENTE JSON válido no formato:
                {"intencao":"CONSULTA_PRECO"}.

                Intenções permitidas:
                - CONSULTA_PRECO: pergunta sobre valor, preço, tabela, desconto, custo, orçamento.
                - BUSCA_MATERIAL: pergunta sobre material, acabamento, especificação técnica, memorial descritivo.
                - SIMULACAO_FINANCEIRA: pergunta sobre entrada, parcelas, financiamento, fluxo, condições de pagamento.

                Regras:
                - Retorne exatamente uma das três intenções.
                - Não explique.
                - Não responda a pergunta do usuário.
                - Não inclua campos extras.
                """;

        String userPrompt = "Pergunta do usuário: " + perguntaNormalizada;
        OpenAIService.OpenAIResult aiResult = openAIService.perguntar(systemPrompt, userPrompt);
        IaDtos.IntencaoIA intencao = extrairIntencao(aiResult.resposta());

        return new IaDtos.ClassificacaoIntencaoResponseDTO(intencao);
    }

    private Optional<IaDtos.IntencaoIA> classificarPorHeuristica(String pergunta) {
        String texto = normalizarTexto(pergunta);

        if (texto.contains("proposta de venda") || texto.contains("proposta comercial")) {
            return Optional.of(IaDtos.IntencaoIA.CONSULTA_PRECO);
        }

        if (contemAlgum(texto,
                "simulacao", "simular", "tabela price", "sac",
                "amortizacao", "juros", "entrada", "parcelas", "parcela",
                "fluxo de pagamento", "fgts")) {
            return Optional.of(IaDtos.IntencaoIA.SIMULACAO_FINANCEIRA);
        }

        if (contemAlgum(texto,
                "material", "acabamento", "especificacao", "memorial",
                "catalogo", "flyer", "pdf", "imagem", "imagens", "planta")) {
            return Optional.of(IaDtos.IntencaoIA.BUSCA_MATERIAL);
        }

        if (contemAlgum(texto,
                "preco", "valor", "quanto custa", "tabela", "orcamento",
                "unidade", "andar", "pavimento", "tipo")) {
            return Optional.of(IaDtos.IntencaoIA.CONSULTA_PRECO);
        }

        return Optional.empty();
    }

    private boolean contemAlgum(String texto, String... termos) {
        for (String termo : termos) {
            if (texto.contains(termo)) {
                return true;
            }
        }
        return false;
    }

    private String normalizarTexto(String valor) {
        if (valor == null) {
            return "";
        }
        String normalized = Normalizer.normalize(valor, Normalizer.Form.NFD);
        return normalized.replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT).trim();
    }

    private IaDtos.IntencaoIA extrairIntencao(String respostaAi) {
        if (respostaAi == null || respostaAi.isBlank()) {
            throw new BadRequestException("Classificação de intenção inválida");
        }

        try {
            JsonNode root = objectMapper.readTree(respostaAi);
            JsonNode intencaoNode = root.get("intencao");
            if (intencaoNode != null && intencaoNode.isTextual()) {
                return parseIntencao(intencaoNode.asText());
            }
        } catch (JsonProcessingException ignored) {
            // Fallback regex below.
        }

        Matcher matcher = INTENCAO_PATTERN.matcher(respostaAi);
        if (matcher.find()) {
            return parseIntencao(matcher.group(1));
        }

        return parseIntencao(respostaAi);
    }

    private IaDtos.IntencaoIA parseIntencao(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new BadRequestException("Classificação de intenção inválida");
        }

        String normalized = raw.trim().toUpperCase(Locale.ROOT)
                .replace("`", "")
                .replace("\"", "")
                .replace("{", "")
                .replace("}", "");

        try {
            return IaDtos.IntencaoIA.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Classificação de intenção inválida: " + normalized);
        }
    }
}
