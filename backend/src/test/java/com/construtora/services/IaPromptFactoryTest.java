package com.construtora.services;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

class IaPromptFactoryTest {

    private final IaPromptFactory factory = new IaPromptFactory();

    @Test
    void deveConterRegrasCriticasNoPromptDeProposta() {
        String prompt = factory.buildPropostaSystemPrompt().toLowerCase();

        assertTrue(prompt.contains("sempre responda em markdown"));
        assertTrue(prompt.contains("indice cub") || prompt.contains("índice cub"));
        assertTrue(prompt.contains("primeira parcela estimada"));
        assertTrue(prompt.contains("jamais cite financiamento com banco"));
    }

    @Test
    void deveConterRegrasCriticasNoPromptDeInventario() {
        String prompt = factory.buildInventorySystemPromptBase().toLowerCase();

        assertTrue(prompt.contains("nunca inclua as colunas \"status\""));
        assertTrue(prompt.contains("nao tenho essa informacao confirmada no momento")
                || prompt.contains("não tenho essa informação confirmada no momento"));
        assertTrue(prompt.contains("tabelas markdown"));
    }
}
