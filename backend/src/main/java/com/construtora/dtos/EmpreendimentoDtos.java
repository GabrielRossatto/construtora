package com.construtora.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

public class EmpreendimentoDtos {

    public record CreateEmpreendimentoRequest(
            @NotBlank @Size(max = 160) String nome,
            @NotBlank String descricao,
            String fotoPerfilUrl
    ) {}

    public record UpdateEmpreendimentoRequest(
            @NotBlank @Size(max = 160) String nome,
            @NotBlank String descricao,
            String fotoPerfilUrl
    ) {}

    public record EmpreendimentoArquivoResponse(
            Long id,
            String url,
            String tipo,
            Long tamanhoBytes,
            Instant dataUpload
    ) {}

    public record EmpreendimentoResponse(
            Long id,
            Long empresaId,
            String publicToken,
            String nome,
            String descricao,
            String fotoPerfilUrl,
            Instant dataCriacao,
            List<EmpreendimentoArquivoResponse> arquivos
    ) {}
}
