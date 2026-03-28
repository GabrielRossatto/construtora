package com.construtora.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public class InstitucionalDtos {

    public record CreateInstitucionalArquivoRequest(
            @NotBlank @Size(max = 180) String titulo,
            @Size(max = 1000) String link
    ) {}

    public record InstitucionalArquivoResponse(
            Long id,
            String titulo,
            String arquivoUrl,
            String arquivoNome,
            String link,
            Instant dataCriacao
    ) {}
}
