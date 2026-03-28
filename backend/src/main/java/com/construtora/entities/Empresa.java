package com.construtora.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "empresa")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Empresa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 140)
    private String nome;

    @Column(nullable = false, unique = true, length = 18)
    private String cnpj;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PlanoEmpresa plano;

    @Column(name = "icone_url", length = 500)
    private String iconeUrl;

    @Column(name = "icone_nome", length = 255)
    private String iconeNome;

    @Column(name = "data_criacao", nullable = false, updatable = false)
    private Instant dataCriacao;

    @PrePersist
    void onCreate() {
        this.dataCriacao = Instant.now();
    }
}
