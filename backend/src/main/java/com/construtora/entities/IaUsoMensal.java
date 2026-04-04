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
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "ia_uso_mensal")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IaUsoMensal {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "empresa_id", nullable = false)
    private Long empresaId;

    @Column(nullable = false)
    private LocalDate mes;

    @Column(name = "total_perguntas", nullable = false)
    private Integer totalPerguntas;

    @Column(name = "total_tokens", nullable = false)
    private Integer totalTokens;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        if (id == null || id.isBlank()) {
            id = UUID.randomUUID().toString();
        }
        if (totalPerguntas == null) {
            totalPerguntas = 0;
        }
        if (totalTokens == null) {
            totalTokens = 0;
        }
        updatedAt = Instant.now();
    }
}
