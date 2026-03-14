package com.construtora.controllers;

import com.construtora.dtos.MaterialDtos;
import com.construtora.services.MaterialService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/materiais")
public class MaterialController {

    private final MaterialService materialService;

    public MaterialController(MaterialService materialService) {
        this.materialService = materialService;
    }

    @PostMapping(consumes = {"multipart/form-data"})
    @PreAuthorize("@permissionService.hasPermission(authentication, 'CREATE_MATERIAL')")
    public MaterialDtos.MaterialResponse create(@RequestPart("payload") @Valid MaterialDtos.CreateMaterialRequest request,
                                                @RequestPart("file") MultipartFile file,
                                                HttpServletRequest httpRequest) {
        return materialService.create(request, file, httpRequest);
    }

    @GetMapping
    @PreAuthorize("@permissionService.hasPermission(authentication, 'VIEW_MATERIAL')")
    public List<MaterialDtos.MaterialResponse> list() {
        return materialService.list();
    }
}
