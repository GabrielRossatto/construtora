package com.construtora.entities;

import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.time.Instant;
import java.util.Set;

@Entity
@Table(name = "user_account")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "empresa_id", nullable = false)
    private Long empresaId;

    @Column(nullable = false, length = 120)
    private String nome;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(length = 30)
    private String telefone;

    @Column(name = "senha_hash", nullable = false, length = 255)
    private String senhaHash;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id")
    private Role role;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "user_permission",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    @Builder.Default
    private Set<Permission> customPermissions = new HashSet<>();

    @Column(nullable = false)
    private Boolean ativo;

    @Column(name = "data_criacao", nullable = false, updatable = false)
    private Instant dataCriacao;

    @Column(name = "ultimo_login")
    private Instant ultimoLogin;

    @PrePersist
    void onCreate() {
        this.dataCriacao = Instant.now();
        if (this.ativo == null) {
            this.ativo = true;
        }
    }
}
