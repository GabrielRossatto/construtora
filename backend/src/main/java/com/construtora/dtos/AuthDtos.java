package com.construtora.dtos;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.List;

public class AuthDtos {

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String senha
    ) {}

    public record LoginResponse(
            String token,
            Instant expiresAt,
            UserSummary user
    ) {}

    public record UserSummary(
            Long id,
            Long empresaId,
            String nome,
            String email,
            String role,
            List<String> permissions
    ) {}
}
