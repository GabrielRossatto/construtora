package com.construtora.dtos;

import com.construtora.entities.ModeloTabelaTema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class TabelaVendasAdminDtos {

    public record EmpresaResumo(
            Long id,
            String nome,
            String cnpj,
            String publicToken
    ) {}

    public record TabelaVendasConfigRequest(
            @NotNull ModeloTabelaTema tema,
            @Pattern(regexp = "^#?[0-9A-Fa-f]{6}$|^$", message = "Cor primária inválida") String corPrimaria,
            @Pattern(regexp = "^#?[0-9A-Fa-f]{6}$|^$", message = "Cor secundária inválida") String corSecundaria,
            @Pattern(regexp = "^#?[0-9A-Fa-f]{6}$|^$", message = "Cor de texto inválida") String corTexto,
            @Pattern(regexp = "^#?[0-9A-Fa-f]{6}$|^$", message = "Cor de fundo inválida") String corFundo,
            @Size(max = 255) String textoRodape,
            @NotNull Boolean exibirEndereco,
            @NotNull Boolean exibirIcone,
            @NotNull Boolean pagamentoEmDestaque,
            @NotNull Integer larguraColunaLateralPx,
            @NotNull Integer alturaImagemPercentual,
            @NotNull Integer divisaoInferiorPercentual
    ) {}

    public record TabelaVendasConfigResponse(
            Long empresaId,
            String empresaNome,
            String cnpj,
            String publicToken,
            ModeloTabelaTema tema,
            String corPrimaria,
            String corSecundaria,
            String corTexto,
            String corFundo,
            String textoRodape,
            Boolean exibirEndereco,
            Boolean exibirIcone,
            Boolean pagamentoEmDestaque,
            Integer larguraColunaLateralPx,
            Integer alturaImagemPercentual,
            Integer divisaoInferiorPercentual
    ) {}
}
