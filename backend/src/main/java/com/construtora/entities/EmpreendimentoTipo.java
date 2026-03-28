package com.construtora.entities;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "empreendimento_tipo",
        uniqueConstraints = @UniqueConstraint(name = "uk_empreendimento_tipo_titulo", columnNames = {"empreendimento_id", "titulo"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmpreendimentoTipo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "empreendimento_id", nullable = false)
    private Empreendimento empreendimento;

    @Column(nullable = false, length = 40)
    private String titulo;

    @Column(name = "area_metragem", nullable = false, precision = 10, scale = 2)
    private BigDecimal areaMetragem;

    @Column(name = "planta_imagem_url", length = 500)
    private String plantaImagemUrl;

    @Column(name = "quantidade_suites", nullable = false)
    private Integer quantidadeSuites;

    @Column(name = "quantidade_vagas", nullable = false)
    private Integer quantidadeVagas;

    @OneToMany(mappedBy = "tipo", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<EmpreendimentoTipoUnidade> unidades = new ArrayList<>();
}
