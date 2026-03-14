package com.construtora.dtos;

import com.construtora.entities.MaterialTipoArquivo;

import java.time.Instant;
import java.util.List;

public class PublicDtos {

    public record PublicMaterialItem(
            Long id,
            String titulo,
            MaterialTipoArquivo tipoArquivo,
            String arquivoUrl,
            String descricao,
            Long tamanhoBytes,
            Instant dataUpload
    ) {}

    public record PublicCampanhaItem(
            Long id,
            String titulo,
            String descricao,
            Instant dataCriacao,
            int quantidadeMateriais
    ) {}

    public record PublicEmpreendimentoMateriaisResponse(
            Long empreendimentoId,
            String empreendimentoNome,
            String fotoPerfilUrl,
            List<PublicMaterialItem> materiais,
            List<PublicCampanhaItem> campanhas
    ) {}
}
