package com.construtora.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "empreendimento_arquivo")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmpreendimentoArquivo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "empresa_id", nullable = false)
    private Long empresaId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "empresa_id", insertable = false, updatable = false)
    private Empresa empresa;

    @ManyToOne(optional = false)
    @JoinColumn(name = "empreendimento_id")
    private Empreendimento empreendimento;

    @Column(nullable = false, length = 500)
    private String url;

    @Column(nullable = false, length = 60)
    private String tipo;

    @Column(name = "tamanho_bytes", nullable = false)
    private Long tamanhoBytes;

    @Column(name = "data_upload", nullable = false)
    private Instant dataUpload;

    @PrePersist
    void onCreate() {
        this.dataUpload = Instant.now();
    }
}
