package com.construtora.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ia_interacoes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IaInteracao {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "empresa_id", nullable = false)
    private Long empresaId;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(name = "empreendimento_id")
    private Long empreendimentoId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String pergunta;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String resposta;

    @Column(name = "resposta_original", columnDefinition = "TEXT")
    private String respostaOriginal;

    @Column(name = "resposta_ajustada", nullable = false)
    private Boolean respostaAjustada;

    @Column(name = "nota_qualidade", nullable = false)
    private Integer notaQualidade;

    @Column(name = "tokens_usados", nullable = false)
    private Integer tokensUsados;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (id == null || id.isBlank()) {
            id = UUID.randomUUID().toString();
        }
        if (respostaAjustada == null) {
            respostaAjustada = false;
        }
        if (notaQualidade == null) {
            notaQualidade = 0;
        }
        createdAt = Instant.now();
    }
}
