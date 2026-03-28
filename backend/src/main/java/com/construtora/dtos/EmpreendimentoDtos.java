package com.construtora.dtos;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public class EmpreendimentoDtos {

    public record LocalizacaoRequest(
            @NotBlank @Size(max = 10) String cep,
            @NotBlank @Size(max = 160) String logradouro,
            @NotBlank @Size(max = 20) String numero,
            @Size(max = 120) String complemento,
            @NotBlank @Size(max = 120) String bairro,
            @NotBlank @Size(max = 120) String cidade,
            @NotBlank @Size(min = 2, max = 2) String estado
    ) {}

    public record TipoUnidadeRequest(
            @NotBlank @Size(max = 40) String codigoUnidade,
            @NotBlank @Size(max = 20) String tipoValor,
            BigDecimal valor
    ) {}

    public record TipoRequest(
            @NotNull @DecimalMin(value = "0.01") BigDecimal areaMetragem,
            String plantaImagemUrl,
            @NotNull @Min(0) @Max(20) Integer quantidadeSuites,
            @NotNull @Min(0) @Max(20) Integer quantidadeVagas,
            @NotEmpty List<@Valid TipoUnidadeRequest> unidades
    ) {}

    public record CreateEmpreendimentoRequest(
            @NotBlank @Size(max = 160) String nome,
            @NotBlank String descricao,
            String fotoPerfilUrl,
            @NotNull @Valid LocalizacaoRequest localizacao,
            @NotEmpty List<@Valid TipoRequest> tipos,
            @NotNull @DecimalMin(value = "0.01") BigDecimal metragemLazer,
            @NotBlank String descricaoLazer,
            @NotNull @Min(0) @Max(100) Integer percentualObra,
            @Size(max = 20) String entradaTipo,
            BigDecimal entradaValor,
            String saldoPagamento,
            String reforcosPagamento,
            LocalDate dataInicioObra,
            LocalDate dataEntrega
    ) {}

    public record UpdateEmpreendimentoRequest(
            @NotBlank @Size(max = 160) String nome,
            @NotBlank String descricao,
            String fotoPerfilUrl,
            @NotNull @Valid LocalizacaoRequest localizacao,
            @NotEmpty List<@Valid TipoRequest> tipos,
            @NotNull @DecimalMin(value = "0.01") BigDecimal metragemLazer,
            @NotBlank String descricaoLazer,
            @NotNull @Min(0) @Max(100) Integer percentualObra,
            @Size(max = 20) String entradaTipo,
            BigDecimal entradaValor,
            String saldoPagamento,
            String reforcosPagamento,
            LocalDate dataInicioObra,
            LocalDate dataEntrega
    ) {}

    public record ReajusteValoresRequest(
            @NotBlank String tipo,
            @NotNull @DecimalMin(value = "0.01") BigDecimal valor,
            LocalDate dataReferenciaTabelaVendas
    ) {}

    public record EmpreendimentoArquivoResponse(
            Long id,
            String url,
            String tipo,
            Long tamanhoBytes,
            Instant dataUpload
    ) {}

    public record LocalizacaoResponse(
            String cep,
            String logradouro,
            String numero,
            String complemento,
            String bairro,
            String cidade,
            String estado
    ) {}

    public record TipoUnidadeResponse(
            String codigoUnidade,
            String tipoValor,
            BigDecimal valor
    ) {}

    public record TipoResponse(
            String titulo,
            BigDecimal areaMetragem,
            String plantaImagemUrl,
            Integer quantidadeSuites,
            Integer quantidadeVagas,
            List<TipoUnidadeResponse> unidades
    ) {}

    public record CondicoesPagamentoResponse(
            String entradaTipo,
            BigDecimal entradaValor,
            String saldo,
            String reforcos
    ) {}

    public record EmpreendimentoResponse(
            Long id,
            Long empresaId,
            String publicToken,
            String nome,
            String descricao,
            String fotoPerfilUrl,
            LocalizacaoResponse localizacao,
            List<TipoResponse> tipos,
            BigDecimal metragemLazer,
            String descricaoLazer,
            Integer percentualObra,
            CondicoesPagamentoResponse condicoesPagamento,
            LocalDate dataInicioObra,
            LocalDate dataReferenciaTabelaVendas,
            LocalDate dataEntrega,
            Instant dataCriacao,
            List<EmpreendimentoArquivoResponse> arquivos
    ) {}
}
