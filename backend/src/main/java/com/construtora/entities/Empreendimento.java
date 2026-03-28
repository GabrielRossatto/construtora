package com.construtora.entities;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "empreendimento")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Empreendimento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "empresa_id", nullable = false)
    private Long empresaId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "empresa_id", insertable = false, updatable = false)
    private Empresa empresa;

    @Column(name = "foto_perfil_url", length = 500)
    private String fotoPerfilUrl;

    @Column(name = "public_token", unique = true, length = 40)
    private String publicToken;

    @Column(nullable = false, length = 160)
    private String nome;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String descricao;

    @Column(name = "metragem_lazer", nullable = false, precision = 10, scale = 2)
    private BigDecimal metragemLazer;

    @Column(name = "descricao_lazer", nullable = false, columnDefinition = "TEXT")
    private String descricaoLazer;

    @Column(name = "percentual_obra", nullable = false)
    private Integer percentualObra;

    @Column(name = "data_inicio_obra")
    private LocalDate dataInicioObra;

    @Column(name = "data_entrega")
    private LocalDate dataEntrega;

    @Column(name = "data_referencia_tabela_vendas")
    private LocalDate dataReferenciaTabelaVendas;

    @Column(name = "entrada_tipo", length = 20)
    private String entradaTipo;

    @Column(name = "entrada_valor", precision = 12, scale = 2)
    private BigDecimal entradaValor;

    @Column(name = "saldo_pagamento", columnDefinition = "TEXT")
    private String saldoPagamento;

    @Column(name = "reforcos_pagamento", columnDefinition = "TEXT")
    private String reforcosPagamento;

    @OneToOne(mappedBy = "empreendimento", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private EmpreendimentoLocalizacao localizacao;

    @OneToMany(mappedBy = "empreendimento", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<EmpreendimentoTipo> tipos = new ArrayList<>();

    @Column(name = "data_criacao", nullable = false, updatable = false)
    private Instant dataCriacao;

    @PrePersist
    void onCreate() {
        this.dataCriacao = Instant.now();
    }
}
