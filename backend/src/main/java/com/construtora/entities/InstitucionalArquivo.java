package com.construtora.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "institucional_arquivo")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InstitucionalArquivo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "empresa_id", nullable = false)
    private Long empresaId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "empresa_id", insertable = false, updatable = false)
    private Empresa empresa;

    @Column(nullable = false, length = 180)
    private String titulo;

    @Column(name = "arquivo_url", length = 500)
    private String arquivoUrl;

    @Column(name = "arquivo_nome", length = 255)
    private String arquivoNome;

    @Column(name = "link_url", length = 1000)
    private String linkUrl;

    @Column(name = "data_criacao", nullable = false, updatable = false)
    private Instant dataCriacao;

    @PrePersist
    void onCreate() {
        this.dataCriacao = Instant.now();
    }
}
