package com.construtora.dtos;

import com.construtora.entities.MaterialTipoArquivo;
import com.construtora.entities.ModeloTabelaTema;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public class PublicDtos {

    public record PublicLocalizacao(
            String logradouro,
            String numero,
            String complemento,
            String bairro,
            String cidade,
            String estado
    ) {}

    public record PublicTipoUnidadeItem(
            String codigoUnidade,
            String tipoValor,
            java.math.BigDecimal valor
    ) {}

    public record PublicTipoItem(
            String titulo,
            java.math.BigDecimal areaMetragem,
            Integer quantidadeSuites,
            Integer quantidadeVagas,
            List<PublicTipoUnidadeItem> unidades
    ) {}

    public record PublicCondicoesPagamento(
            String entradaTipo,
            java.math.BigDecimal entradaValor,
            String saldo,
            String reforcos
    ) {}

    public record PublicMaterialItem(
            Long id,
            String titulo,
            MaterialTipoArquivo tipoArquivo,
            String arquivoUrl,
            String pastaDestino,
            String caminhoRelativo,
            String descricao,
            Long tamanhoBytes,
            Instant dataUpload
    ) {}

    public record PublicTabelaConfig(
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

    public record PublicEmpreendimentoMateriaisResponse(
            Long empreendimentoId,
            String empreendimentoNome,
            String fotoPerfilUrl,
            String iconeUrl,
            PublicTabelaConfig tabelaConfig,
            String descricao,
            PublicLocalizacao localizacao,
            List<PublicTipoItem> tipos,
            java.math.BigDecimal metragemLazer,
            String descricaoLazer,
            Integer percentualObra,
            PublicCondicoesPagamento condicoesPagamento,
            LocalDate dataInicioObra,
            LocalDate dataReferenciaTabelaVendas,
            LocalDate dataEntrega,
            List<PublicMaterialItem> materiais
    ) {}
}
