package com.construtora.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "tabela_vendas_empresa_config")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TabelaVendasEmpresaConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "empresa_id", nullable = false, unique = true)
    private Long empresaId;

    @Enumerated(EnumType.STRING)
    @Column(name = "tema", nullable = false, length = 30)
    private ModeloTabelaTema tema;

    @Column(name = "cor_primaria", length = 7)
    private String corPrimaria;

    @Column(name = "cor_secundaria", length = 7)
    private String corSecundaria;

    @Column(name = "cor_texto", length = 7)
    private String corTexto;

    @Column(name = "cor_fundo", length = 7)
    private String corFundo;

    @Column(name = "texto_rodape", length = 255)
    private String textoRodape;

    @Column(name = "exibir_endereco", nullable = false)
    private Boolean exibirEndereco;

    @Column(name = "exibir_icone", nullable = false)
    private Boolean exibirIcone;

    @Column(name = "pagamento_em_destaque", nullable = false)
    private Boolean pagamentoEmDestaque;

    @Column(name = "largura_coluna_lateral_px", nullable = false)
    private Integer larguraColunaLateralPx;

    @Column(name = "altura_imagem_percentual", nullable = false)
    private Integer alturaImagemPercentual;

    @Column(name = "divisao_inferior_percentual", nullable = false)
    private Integer divisaoInferiorPercentual;

    @Column(name = "imagem_offset_x", nullable = false)
    private Integer imagemOffsetX;

    @Column(name = "imagem_offset_y", nullable = false)
    private Integer imagemOffsetY;

    @Column(name = "icone_offset_x", nullable = false)
    private Integer iconeOffsetX;

    @Column(name = "icone_offset_y", nullable = false)
    private Integer iconeOffsetY;

    @Column(name = "pagamento_offset_x", nullable = false)
    private Integer pagamentoOffsetX;

    @Column(name = "pagamento_offset_y", nullable = false)
    private Integer pagamentoOffsetY;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    void touch() {
        if (tema == null) {
            tema = ModeloTabelaTema.CLASSICO;
        }
        if (exibirEndereco == null) {
            exibirEndereco = true;
        }
        if (exibirIcone == null) {
            exibirIcone = true;
        }
        if (pagamentoEmDestaque == null) {
            pagamentoEmDestaque = true;
        }
        if (larguraColunaLateralPx == null) {
            larguraColunaLateralPx = 450;
        }
        if (alturaImagemPercentual == null) {
            alturaImagemPercentual = 70;
        }
        if (divisaoInferiorPercentual == null) {
            divisaoInferiorPercentual = 50;
        }
        if (imagemOffsetX == null) {
            imagemOffsetX = 0;
        }
        if (imagemOffsetY == null) {
            imagemOffsetY = 0;
        }
        if (iconeOffsetX == null) {
            iconeOffsetX = 0;
        }
        if (iconeOffsetY == null) {
            iconeOffsetY = 0;
        }
        if (pagamentoOffsetX == null) {
            pagamentoOffsetX = 0;
        }
        if (pagamentoOffsetY == null) {
            pagamentoOffsetY = 0;
        }
        updatedAt = Instant.now();
    }
}
