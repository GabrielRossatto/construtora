package com.construtora.dtos;

import com.construtora.entities.RoleName;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class UserDtos {

    public record CreateUserRequest(
            @NotBlank @Size(max = 120) String nome,
            @NotBlank @Email @Size(max = 150) String email,
            @Size(max = 30) String telefone,
            @NotBlank @Size(min = 8, max = 100) String senha,
            @NotNull RoleName role
    ) {}

    public record UserResponse(
            Long id,
            Long empresaId,
            String nome,
            String email,
            String telefone,
            String role,
            Boolean ativo
    ) {}
}
