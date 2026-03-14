package com.construtora.controllers;

import com.construtora.dtos.CampanhaDtos;
import com.construtora.services.CampanhaService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/campanhas")
public class CampanhaController {

    private final CampanhaService campanhaService;

    public CampanhaController(CampanhaService campanhaService) {
        this.campanhaService = campanhaService;
    }

    @PostMapping
    @PreAuthorize("@permissionService.hasPermission(authentication, 'CREATE_CAMPAIGN')")
    public CampanhaDtos.CampanhaResponse create(@Valid @RequestBody CampanhaDtos.CreateCampanhaRequest request,
                                                HttpServletRequest httpRequest) {
        return campanhaService.create(request, httpRequest);
    }

    @GetMapping
    @PreAuthorize("@permissionService.hasPermission(authentication, 'VIEW_CAMPAIGN')")
    public List<CampanhaDtos.CampanhaResponse> list() {
        return campanhaService.list();
    }
}
