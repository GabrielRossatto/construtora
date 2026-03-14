package com.construtora.dtos;

import com.construtora.entities.MaterialTipoArquivo;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public class MaterialDtos {

    public record CreateMaterialRequest(
            @NotBlank @Size(max = 160) String titulo,
            @NotNull MaterialTipoArquivo tipoArquivo,
            Long empreendimentoId,
            @NotBlank String descricao
    ) {}

    public record MaterialResponse(
            Long id,
            Long empresaId,
            Long empreendimentoId,
            String titulo,
            MaterialTipoArquivo tipoArquivo,
            String arquivoUrl,
            String descricao,
            Long tamanhoBytes,
            Instant dataUpload
    ) {}
}
