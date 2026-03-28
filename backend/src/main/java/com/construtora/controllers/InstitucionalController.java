package com.construtora.controllers;

import com.construtora.dtos.InstitucionalDtos;
import com.construtora.services.InstitucionalService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/institucional")
public class InstitucionalController {

    private final InstitucionalService institucionalService;

    public InstitucionalController(InstitucionalService institucionalService) {
        this.institucionalService = institucionalService;
    }

    @GetMapping
    @PreAuthorize("@permissionService.hasPermission(authentication, 'VIEW_ENTERPRISE')")
    public List<InstitucionalDtos.InstitucionalArquivoResponse> list() {
        return institucionalService.list();
    }

    @PostMapping(consumes = "multipart/form-data")
    @PreAuthorize("@permissionService.hasPermission(authentication, 'VIEW_ENTERPRISE')")
    public InstitucionalDtos.InstitucionalArquivoResponse create(
            @RequestPart("payload") @Valid InstitucionalDtos.CreateInstitucionalArquivoRequest request,
            @RequestPart(value = "arquivo", required = false) MultipartFile arquivo
    ) {
        return institucionalService.create(request, arquivo);
    }

    @PutMapping(value = "/{id}", consumes = "multipart/form-data")
    @PreAuthorize("@permissionService.hasPermission(authentication, 'VIEW_ENTERPRISE')")
    public InstitucionalDtos.InstitucionalArquivoResponse update(
            @PathVariable Long id,
            @RequestPart("payload") @Valid InstitucionalDtos.CreateInstitucionalArquivoRequest request,
            @RequestPart(value = "arquivo", required = false) MultipartFile arquivo
    ) {
        return institucionalService.update(id, request, arquivo);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@permissionService.hasPermission(authentication, 'VIEW_ENTERPRISE')")
    public void delete(@PathVariable Long id) {
        institucionalService.delete(id);
    }

    @GetMapping("/{id}/download")
    @PreAuthorize("@permissionService.hasPermission(authentication, 'VIEW_ENTERPRISE')")
    public ResponseEntity<byte[]> download(@PathVariable Long id) {
        var downloaded = institucionalService.download(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + downloaded.arquivoNome() + "\"")
                .contentType(MediaType.parseMediaType(downloaded.contentType()))
                .body(downloaded.bytes());
    }
}
