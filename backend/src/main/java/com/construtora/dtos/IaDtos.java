package com.construtora.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public class IaDtos {

    public enum IntencaoIA {
        CONSULTA_PRECO,
        BUSCA_MATERIAL,
        SIMULACAO_FINANCEIRA
    }

    public record PerguntaRequestDTO(
            Long empresaId,
            Long empreendimentoId,
            @NotBlank @Size(max = 4000) String pergunta
    ) {}

    public record ClassificacaoIntencaoRequestDTO(
            @NotBlank @Size(max = 4000) String pergunta
    ) {}

    public record ClassificacaoIntencaoResponseDTO(
            IntencaoIA intencao
    ) {}

    public record RespostaDTO(
            Long empresaId,
            String resposta,
            Integer tokensUsados,
            Integer totalPerguntasMes,
            Integer totalTokensMes,
            Integer limitePerguntasMes,
            Instant createdAt
    ) {}

    public record InteracaoResponseDTO(
            String id,
            Long empreendimentoId,
            String pergunta,
            String resposta,
            Integer tokensUsados,
            Integer notaQualidade,
            Boolean respostaAjustada,
            Instant createdAt
    ) {}
}
