package com.construtora.controllers;

import com.construtora.dtos.PublicDtos;
import com.construtora.services.PublicAccessService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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

    @GetMapping("/empreendimentos/{publicToken}/materiais/zip")
    public ResponseEntity<byte[]> downloadMateriaisZip(@PathVariable String publicToken) {
        var downloaded = publicAccessService.downloadMateriaisZip(publicToken);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + downloaded.fileName() + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(downloaded.bytes());
    }

    @GetMapping("/empreendimentos/{publicToken}/materiais/pastas/{pastaDestino}/zip")
    public ResponseEntity<byte[]> downloadMateriaisFolderZip(@PathVariable String publicToken,
                                                             @PathVariable String pastaDestino) {
        var downloaded = publicAccessService.downloadMateriaisFolderZip(publicToken, pastaDestino);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + downloaded.fileName() + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(downloaded.bytes());
    }
}
