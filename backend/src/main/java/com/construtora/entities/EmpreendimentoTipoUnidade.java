package com.construtora.entities;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(
        name = "empreendimento_tipo_unidade",
        uniqueConstraints = @UniqueConstraint(name = "uk_tipo_unidade_codigo", columnNames = {"tipo_id", "codigo_unidade"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmpreendimentoTipoUnidade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "tipo_id", nullable = false)
    private EmpreendimentoTipo tipo;

    @Column(name = "codigo_unidade", nullable = false, length = 40)
    private String codigoUnidade;

    @Column(name = "tipo_valor", nullable = false, length = 20)
    private String tipoValor;

    @Column(name = "valor", precision = 12, scale = 2)
    private BigDecimal valor;
}
