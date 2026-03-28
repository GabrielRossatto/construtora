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
            @Size(max = 180) String pastaDestino,
            @Size(max = 500) String caminhoRelativo,
            String descricao,
            @NotBlank @Size(max = 500) String arquivoUrl,
            @NotNull Long tamanhoBytes
    ) {}

    public record UpdateMaterialRequest(
            @NotBlank @Size(max = 160) String titulo,
            @NotNull MaterialTipoArquivo tipoArquivo,
            @Size(max = 180) String pastaDestino,
            @Size(max = 500) String caminhoRelativo,
            String descricao
    ) {}

    public record MaterialUploadResponse(
            String storageKey,
            String arquivoUrl,
            String contentType,
            Long tamanhoBytes
    ) {}

    public record MaterialResponse(
            Long id,
            Long empresaId,
            Long empreendimentoId,
            String titulo,
            MaterialTipoArquivo tipoArquivo,
            String arquivoUrl,
            String pastaDestino,
            String caminhoRelativo,
            String descricao,
            Long tamanhoBytes,
            Instant dataUpload
    ) {}
}
