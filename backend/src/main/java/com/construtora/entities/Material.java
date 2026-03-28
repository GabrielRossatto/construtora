package com.construtora.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "material")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Material {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "empresa_id", nullable = false)
    private Long empresaId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "empresa_id", insertable = false, updatable = false)
    private Empresa empresa;

    @ManyToOne
    @JoinColumn(name = "empreendimento_id")
    private Empreendimento empreendimento;

    @Column(nullable = false, length = 160)
    private String titulo;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_arquivo", nullable = false, length = 20)
    private MaterialTipoArquivo tipoArquivo;

    @Column(name = "arquivo_url", nullable = false, length = 500)
    private String arquivoUrl;

    @Column(name = "pasta_destino", length = 180)
    private String pastaDestino;

    @Column(name = "caminho_relativo", length = 500)
    private String caminhoRelativo;

    @Column(columnDefinition = "TEXT")
    private String descricao;

    @Column(name = "tamanho_bytes", nullable = false)
    private Long tamanhoBytes;

    @Column(name = "data_upload", nullable = false)
    private Instant dataUpload;

    @PrePersist
    void onCreate() {
        this.dataUpload = Instant.now();
    }
}
