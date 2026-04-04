package com.construtora.services;

import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
public class IaQualityService {

    public int calcularNota(String pergunta, String respostaFinal, boolean respostaAjustada) {
        if (respostaFinal == null || respostaFinal.isBlank()) {
            return 0;
        }

        String perguntaNormalizada = normalizar(pergunta);
        String respostaNormalizada = normalizar(respostaFinal);

        int score = 100;
        if (respostaAjustada) {
            score -= 8;
        }
        if (contemTermoTecnicoProibido(respostaNormalizada)) {
            score -= 30;
        }
        if (contemMencaoBancaria(respostaNormalizada)) {
            score -= 20;
        }
        if (respostaFinal.length() < 80) {
            score -= 8;
        }
        if (perguntaNormalizada.contains("proposta") && !respostaNormalizada.contains("cub")) {
            score -= 20;
        }
        if (perguntaNormalizada.contains("proposta") && !respostaNormalizada.contains("primeira parcela")) {
            score -= 12;
        }
        if (respostaFinal.contains("|") && respostaFinal.contains("---")) {
            score += 5;
        }

        return Math.max(0, Math.min(score, 100));
    }

    private boolean contemTermoTecnicoProibido(String respostaNormalizada) {
        return respostaNormalizada.contains("json")
                || respostaNormalizada.contains("backend")
                || respostaNormalizada.contains("api")
                || respostaNormalizada.contains("nulo")
                || respostaNormalizada.contains("null")
                || respostaNormalizada.contains("tipovalor")
                || respostaNormalizada.contains("campo");
    }

    private boolean contemMencaoBancaria(String respostaNormalizada) {
        return respostaNormalizada.contains("financiamento banc")
                || respostaNormalizada.contains("financiamento com banco")
                || respostaNormalizada.contains("credito imobiliario banc")
                || respostaNormalizada.contains("aprovacao bancaria")
                || respostaNormalizada.contains(" banco ");
    }

    private String normalizar(String texto) {
        if (texto == null) {
            return "";
        }
        String normalized = java.text.Normalizer.normalize(texto, java.text.Normalizer.Form.NFD);
        return normalized.replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT).trim();
    }
}
