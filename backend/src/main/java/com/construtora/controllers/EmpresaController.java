package com.construtora.controllers;

import com.construtora.dtos.EmpresaDtos;
import com.construtora.services.EmpresaService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/empresas")
public class EmpresaController {

    private final EmpresaService empresaService;

    public EmpresaController(EmpresaService empresaService) {
        this.empresaService = empresaService;
    }

    @PostMapping
    public EmpresaDtos.EmpresaResponse create(@Valid @RequestBody EmpresaDtos.CreateEmpresaRequest request) {
        return empresaService.createEmpresa(request);
    }

    @GetMapping("/me")
    @PreAuthorize("@permissionService.hasPermission(authentication, 'VIEW_ENTERPRISE')")
    public EmpresaDtos.EmpresaResponse me() {
        return empresaService.getMyEmpresa();
    }
}
