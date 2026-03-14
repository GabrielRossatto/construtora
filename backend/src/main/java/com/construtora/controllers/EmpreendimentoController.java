package com.construtora.controllers;

import com.construtora.dtos.EmpreendimentoDtos;
import com.construtora.services.EmpreendimentoService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/empreendimentos")
public class EmpreendimentoController {

    private final EmpreendimentoService empreendimentoService;

    public EmpreendimentoController(EmpreendimentoService empreendimentoService) {
        this.empreendimentoService = empreendimentoService;
    }

    @PostMapping(consumes = "application/json")
    @PreAuthorize("@permissionService.hasPermission(authentication, 'CREATE_DEVELOPMENT')")
    public EmpreendimentoDtos.EmpreendimentoResponse create(@Valid @RequestBody EmpreendimentoDtos.CreateEmpreendimentoRequest request) {
        return empreendimentoService.create(request);
    }

    @PostMapping(consumes = {"multipart/form-data"})
    @PreAuthorize("@permissionService.hasPermission(authentication, 'CREATE_DEVELOPMENT')")
    public EmpreendimentoDtos.EmpreendimentoResponse createWithPhoto(
            @RequestPart("payload") @Valid EmpreendimentoDtos.CreateEmpreendimentoRequest request,
            @RequestPart(value = "fotoPerfil", required = false) MultipartFile fotoPerfil
    ) {
        return empreendimentoService.create(request, fotoPerfil);
    }

    @GetMapping
    @PreAuthorize("@permissionService.hasPermission(authentication, 'VIEW_DEVELOPMENT')")
    public List<EmpreendimentoDtos.EmpreendimentoResponse> list() {
        return empreendimentoService.list();
    }

    @PutMapping("/{id}")
    @PreAuthorize("@permissionService.hasPermission(authentication, 'CREATE_DEVELOPMENT')")
    public EmpreendimentoDtos.EmpreendimentoResponse update(@PathVariable Long id,
                                                            @Valid @RequestBody EmpreendimentoDtos.UpdateEmpreendimentoRequest request,
                                                            HttpServletRequest httpRequest) {
        return empreendimentoService.update(id, request, httpRequest);
    }

    @PostMapping("/{id}/arquivos")
    @PreAuthorize("@permissionService.hasPermission(authentication, 'UPLOAD_FILE')")
    public EmpreendimentoDtos.EmpreendimentoArquivoResponse upload(@PathVariable Long id,
                                                                   @RequestParam("file") MultipartFile file,
                                                                   HttpServletRequest httpRequest) {
        return empreendimentoService.uploadArquivo(id, file, httpRequest);
    }
}
