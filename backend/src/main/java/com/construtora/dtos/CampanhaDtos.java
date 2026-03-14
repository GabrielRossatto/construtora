package com.construtora.dtos;

import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.List;

public class CampanhaDtos {

    public record CreateCampanhaRequest(
            @NotBlank String titulo,
            @NotBlank String descricao,
            List<Long> materialIds
    ) {}

    public record CampanhaResponse(
            Long id,
            Long empresaId,
            String titulo,
            String descricao,
            List<Long> materialIds,
            Instant dataCriacao
    ) {}
}
