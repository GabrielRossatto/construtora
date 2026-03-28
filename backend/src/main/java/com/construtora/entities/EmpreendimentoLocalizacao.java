package com.construtora.entities;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "empreendimento_localizacao")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmpreendimentoLocalizacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "empreendimento_id", nullable = false, unique = true)
    private Empreendimento empreendimento;

    @Column(nullable = false, length = 10)
    private String cep;

    @Column(nullable = false, length = 160)
    private String logradouro;

    @Column(nullable = false, length = 20)
    private String numero;

    @Column(length = 120)
    private String complemento;

    @Column(nullable = false, length = 120)
    private String bairro;

    @Column(nullable = false, length = 120)
    private String cidade;

    @Column(nullable = false, length = 2)
    private String estado;
}
