package com.construtora.controllers;

import com.construtora.dtos.TabelaVendasAdminDtos;
import com.construtora.services.TabelaVendasAdminService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/internal/tabela-vendas")
public class TabelaVendasAdminController {

    private final TabelaVendasAdminService tabelaVendasAdminService;

    public TabelaVendasAdminController(TabelaVendasAdminService tabelaVendasAdminService) {
        this.tabelaVendasAdminService = tabelaVendasAdminService;
    }

    @GetMapping("/empresas")
    public List<TabelaVendasAdminDtos.EmpresaResumo> listarEmpresas() {
        return tabelaVendasAdminService.listarEmpresas();
    }

    @GetMapping("/empresas/{empresaId}")
    public TabelaVendasAdminDtos.TabelaVendasConfigResponse obterConfig(@PathVariable Long empresaId) {
        return tabelaVendasAdminService.obterConfig(empresaId);
    }

    @PutMapping("/empresas/{empresaId}")
    public TabelaVendasAdminDtos.TabelaVendasConfigResponse salvarConfig(@PathVariable Long empresaId,
                                                                         @Valid @RequestBody TabelaVendasAdminDtos.TabelaVendasConfigRequest request) {
        return tabelaVendasAdminService.salvarConfig(empresaId, request);
    }
}
