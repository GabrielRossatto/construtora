package com.construtora.dtos;

import com.construtora.entities.PlanoEmpresa;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public class EmpresaDtos {

    public record CreateEmpresaRequest(
            @NotBlank @Size(max = 140) String nome,
            @NotBlank @Size(max = 18) String cnpj,
            @NotNull PlanoEmpresa plano,
            @NotBlank String adminNome,
            @NotBlank String adminEmail,
            @NotBlank String adminSenha,
            String adminTelefone
    ) {}

    public record EmpresaResponse(
            Long id,
            String nome,
            String cnpj,
            PlanoEmpresa plano,
            Instant dataCriacao
    ) {}
}
