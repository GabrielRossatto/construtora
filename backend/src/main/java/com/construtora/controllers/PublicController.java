package com.construtora.controllers;

import com.construtora.dtos.PublicDtos;
import com.construtora.services.PublicAccessService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public")
public class PublicController {

    private final PublicAccessService publicAccessService;

    public PublicController(PublicAccessService publicAccessService) {
        this.publicAccessService = publicAccessService;
    }

    @GetMapping("/empreendimentos/{publicToken}/materiais")
    public PublicDtos.PublicEmpreendimentoMateriaisResponse getMateriais(@PathVariable String publicToken) {
        return publicAccessService.getMateriaisByPublicToken(publicToken);
    }
}
