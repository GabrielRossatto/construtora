package com.construtora.services;

import com.construtora.exceptions.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class OpenAIService {

    private final RestClient restClient;
    private final String apiKey;
    private final String model;
    private final int maxOutputTokens;

    public OpenAIService(RestClient.Builder restClientBuilder,
                         @Value("${app.ai.openai.api-key:}") String apiKey,
                         @Value("${app.ai.openai.model:gpt-5.4}") String model,
                         @Value("${app.ai.openai.max-output-tokens:800}") int maxOutputTokens) {
        this.restClient = restClientBuilder.build();
        this.apiKey = apiKey;
        this.model = model;
        this.maxOutputTokens = maxOutputTokens;
    }

    public OpenAIResult perguntar(String prompt) {
        return perguntar(prompt, prompt);
    }

    public OpenAIResult perguntar(String systemPrompt, String userPrompt) {
        return perguntar(systemPrompt, userPrompt, maxOutputTokens);
    }

    public OpenAIResult perguntar(String systemPrompt, String userPrompt, int customMaxOutputTokens) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new BadRequestException("IA não configurada");
        }

        int resolvedMaxOutputTokens = customMaxOutputTokens > 0 ? customMaxOutputTokens : maxOutputTokens;

        Map<String, Object> body = Map.of(
                "model", model,
                "input", List.of(
                        Map.of(
                                "role", "system",
                                "content", List.of(Map.of("type", "input_text", "text", systemPrompt))
                        ),
                        Map.of(
                                "role", "user",
                                "content", List.of(Map.of("type", "input_text", "text", userPrompt))
                        )
                ),
                "max_output_tokens", resolvedMaxOutputTokens,
                "reasoning", Map.of("effort", "low"),
                "text", Map.of(
                        "format", Map.of("type", "text"),
                        "verbosity", "low"
                )
        );

        try {
            Map<String, Object> response = restClient.post()
                    .uri("https://api.openai.com/v1/responses")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + apiKey)
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            ensureResponseCompleted(response);
            String texto = extractText(response);
            int totalTokens = extractUsageTokens(response);

            if (texto == null || texto.isBlank()) {
                throw new BadRequestException("A IA retornou uma resposta vazia");
            }

            return new OpenAIResult(texto.trim(), totalTokens);
        } catch (RestClientResponseException ex) {
            throw new BadRequestException(extractOpenAiErrorMessage(ex));
        } catch (RestClientException ex) {
            throw new BadRequestException("Falha ao consultar a IA");
        }
    }

    @SuppressWarnings("unchecked")
    private void ensureResponseCompleted(Map<String, Object> response) {
        Object status = response.get("status");
        if (status instanceof String value && "incomplete".equalsIgnoreCase(value)) {
            Object incompleteDetails = response.get("incomplete_details");
            if (incompleteDetails instanceof Map<?, ?> detailsMap) {
                Object reason = detailsMap.get("reason");
                if (reason instanceof String reasonValue && "max_output_tokens".equalsIgnoreCase(reasonValue)) {
                    throw new BadRequestException("A resposta da IA foi cortada por limite de tokens. Tente uma pergunta mais objetiva.");
                }
            }
            throw new BadRequestException("A IA não conseguiu concluir a resposta");
        }
    }

    @SuppressWarnings("unchecked")
    private String extractText(Map<String, Object> response) {
        List<String> texts = new ArrayList<>();
        collectTextValues(response, texts);

        return texts.stream()
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .distinct()
                .collect(java.util.stream.Collectors.joining("\n"));
    }

    @SuppressWarnings("unchecked")
    private void collectTextValues(Object node, List<String> texts) {
        if (node == null) {
            return;
        }

        if (node instanceof List<?> list) {
            for (Object item : list) {
                collectTextValues(item, texts);
            }
            return;
        }

        if (node instanceof Map<?, ?> map) {
            Object text = map.get("text");
            if (text instanceof String value && !value.isBlank()) {
                texts.add(value);
            }

            Object outputText = map.get("output_text");
            if (outputText instanceof String value && !value.isBlank()) {
                texts.add(value);
            }

            Object refusal = map.get("refusal");
            if (refusal instanceof String value && !value.isBlank()) {
                texts.add(value);
            }

            Object content = map.get("content");
            if (content != null) {
                collectTextValues(content, texts);
            }

            Object output = map.get("output");
            if (output != null) {
                collectTextValues(output, texts);
            }

            Object message = map.get("message");
            if (message != null) {
                collectTextValues(message, texts);
            }
        }
    }

    @SuppressWarnings("unchecked")
    private int extractUsageTokens(Map<String, Object> response) {
        Object usage = response.get("usage");
        if (usage instanceof Map<?, ?> usageMap) {
            Object total = usageMap.get("total_tokens");
            if (total instanceof Number number) {
                return number.intValue();
            }
            Object inputTokens = usageMap.get("input_tokens");
            Object outputTokens = usageMap.get("output_tokens");
            int computed = 0;
            if (inputTokens instanceof Number number) {
                computed += number.intValue();
            }
            if (outputTokens instanceof Number number) {
                computed += number.intValue();
            }
            return computed;
        }
        return 0;
    }

    @SuppressWarnings("unchecked")
    private String extractOpenAiErrorMessage(RestClientResponseException ex) {
        try {
            Map<String, Object> body = ex.getResponseBodyAs(Map.class);
            Object error = body.get("error");
            if (error instanceof Map<?, ?> errorMap) {
                Object message = errorMap.get("message");
                if (message instanceof String value && !value.isBlank()) {
                    return value;
                }
            }
        } catch (Exception ignored) {
            // Fallback below.
        }

        if (ex.getStatusCode().value() == 429) {
            return "A chave da OpenAI atingiu o limite de uso ou está sem cota disponível";
        }

        return "Falha ao consultar a IA";
    }

    public record OpenAIResult(
            String resposta,
            int totalTokens
    ) {}
}
