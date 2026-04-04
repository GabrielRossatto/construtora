package com.construtora.services;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

class IaQualityServiceTest {

    private final IaQualityService service = new IaQualityService();

    @Test
    void devePontuarMelhorRespostaComercialConformeRegras() {
        String pergunta = "gere uma proposta de venda para a unidade 802";
        String resposta = """
                | Unidade | Pavimento | Valor |
                | --- | --- | --- |
                | 802 | 8º | R$ 480.000,00 |

                - Primeira Parcela Estimada: R$ 4.000,00 (sujeita ao índice CUB)

                Condição direta com a construtora.
                """;

        int score = service.calcularNota(pergunta, resposta, false);
        assertTrue(score >= 80);
    }

    @Test
    void devePenalizarRespostaComTermosTecnicosEFinanciamentoBancario() {
        String pergunta = "quero proposta";
        String resposta = "Enviei o JSON com campos null e financiamento com banco para aprovação bancária.";

        int score = service.calcularNota(pergunta, resposta, true);
        assertTrue(score <= 40);
    }
}
