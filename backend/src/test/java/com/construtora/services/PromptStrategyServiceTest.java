package com.construtora.services;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PromptStrategyServiceTest {

    private final PromptStrategyService service = new PromptStrategyService();

    @Test
    void deveClassificarPerfisCorretamente() {
        assertEquals(PerfilImovel.ECONOMICO, service.determinarPerfil(BigDecimal.valueOf(500_000)));
        assertEquals(PerfilImovel.MEDIO_PADRAO, service.determinarPerfil(BigDecimal.valueOf(900_000)));
        assertEquals(PerfilImovel.ALTO_PADRAO, service.determinarPerfil(BigDecimal.valueOf(1_500_001)));
    }

    @Test
    void deveIncluirDiretrizDeReservadoNoPromptFinal() {
        String prompt = service.montarSystemPromptFinal("BASE", BigDecimal.valueOf(300_000), true).toLowerCase();

        assertTrue(prompt.contains("consultor de realizacao de sonhos")
                || prompt.contains("consultor de realização de sonhos"));
        assertTrue(prompt.contains("unidades reservadas"));
        assertTrue(prompt.contains("nao use o termo \"nao informado\"")
                || prompt.contains("não use o termo \"não informado\""));
    }
}
