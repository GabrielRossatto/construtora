package com.construtora.services;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class PromptStrategyService {

    private static final BigDecimal LIMITE_ECONOMICO = BigDecimal.valueOf(500_000);
    private static final BigDecimal LIMITE_MEDIO_PADRAO = BigDecimal.valueOf(1_500_000);

    public PerfilImovel determinarPerfil(BigDecimal preco) {
        if (preco == null || preco.compareTo(LIMITE_ECONOMICO) <= 0) {
            return PerfilImovel.ECONOMICO;
        }
        if (preco.compareTo(LIMITE_MEDIO_PADRAO) <= 0) {
            return PerfilImovel.MEDIO_PADRAO;
        }
        return PerfilImovel.ALTO_PADRAO;
    }

    public String determinarDiretriz(BigDecimal preco) {
        PerfilImovel perfil = determinarPerfil(preco);
        return switch (perfil) {
            case ECONOMICO -> """
                    Tonalidade obrigatória:
                    - atue como Consultor de Realização de Sonhos
                    - comunique com acolhimento, motivação e segurança
                    - destaque facilidade de pagamento e uso de FGTS quando aplicável
                    """;
            case MEDIO_PADRAO -> """
                    Tonalidade obrigatória:
                    - atue como Consultor Estratégico Imobiliário
                    - destaque equilíbrio entre valor, localização e qualidade
                    - mantenha linguagem elegante, objetiva e comercial
                    """;
            case ALTO_PADRAO -> """
                    Tonalidade obrigatória:
                    - atue como Advisor de Investimentos
                    - enfatize exclusividade, sofisticação e preservação patrimonial
                    - utilize tom executivo, confiante e altamente profissional
                    """;
        };
    }

    public String montarSystemPromptFinal(String regrasBase, BigDecimal preco, boolean possuiReservado) {
        StringBuilder prompt = new StringBuilder();
        prompt.append(regrasBase.trim());
        prompt.append("\n\n");
        prompt.append(determinarDiretriz(preco).trim());

        if (possuiReservado) {
            prompt.append("\n\n");
            prompt.append("""
                    Diretriz obrigatória para unidades reservadas:
                    - ao tratar indisponibilidade, seja extremamente discreta e profissional
                    - não use o termo "Não informado" para indisponibilidade
                    - informe a indisponibilidade com elegância comercial e objetividade
                    """.trim());
        }

        return prompt.toString();
    }
}
