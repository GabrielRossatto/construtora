package com.construtora.services;

import com.construtora.dtos.MaterialDtos;
import com.construtora.entities.Empreendimento;
import com.construtora.entities.Material;
import com.construtora.exceptions.NotFoundException;
import com.construtora.repositories.EmpreendimentoRepository;
import com.construtora.repositories.MaterialRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
public class MaterialService {

    private final MaterialRepository materialRepository;
    private final EmpreendimentoRepository empreendimentoRepository;
    private final CurrentSessionService currentSessionService;
    private final FileStorageService fileStorageService;
    private final AuditService auditService;

    public MaterialService(MaterialRepository materialRepository,
                           EmpreendimentoRepository empreendimentoRepository,
                           CurrentSessionService currentSessionService,
                           FileStorageService fileStorageService,
                           AuditService auditService) {
        this.materialRepository = materialRepository;
        this.empreendimentoRepository = empreendimentoRepository;
        this.currentSessionService = currentSessionService;
        this.fileStorageService = fileStorageService;
        this.auditService = auditService;
    }

    @Transactional
    public MaterialDtos.MaterialResponse create(MaterialDtos.CreateMaterialRequest request,
                                                MultipartFile file,
                                                HttpServletRequest httpRequest) {
        Long empresaId = currentSessionService.empresaId();

        Empreendimento empreendimento = null;
        if (request.empreendimentoId() != null) {
            empreendimento = empreendimentoRepository.findByIdAndEmpresaId(request.empreendimentoId(), empresaId)
                    .orElseThrow(() -> new NotFoundException("Empreendimento não encontrado"));
        }

        FileStorageService.StoredFile stored = fileStorageService.upload(empresaId, "materiais", file);

        Material material = materialRepository.save(Material.builder()
                .empresaId(empresaId)
                .empreendimento(empreendimento)
                .titulo(request.titulo())
                .tipoArquivo(request.tipoArquivo())
                .arquivoUrl(stored.url())
                .descricao(request.descricao())
                .tamanhoBytes(stored.size())
                .build());

        auditService.log("UPLOAD_MATERIAL", "MATERIAL", material.getId(), httpRequest.getRemoteAddr());
        return toResponse(material);
    }

    public List<MaterialDtos.MaterialResponse> list() {
        Long empresaId = currentSessionService.empresaId();
        return materialRepository.findByEmpresaId(empresaId).stream().map(this::toResponse).toList();
    }

    public Material findByIdInTenant(Long id) {
        return materialRepository.findByIdAndEmpresaId(id, currentSessionService.empresaId())
                .orElseThrow(() -> new NotFoundException("Material não encontrado"));
    }

    private MaterialDtos.MaterialResponse toResponse(Material m) {
        return new MaterialDtos.MaterialResponse(
                m.getId(),
                m.getEmpresaId(),
                m.getEmpreendimento() != null ? m.getEmpreendimento().getId() : null,
                m.getTitulo(),
                m.getTipoArquivo(),
                m.getArquivoUrl(),
                m.getDescricao(),
                m.getTamanhoBytes(),
                m.getDataUpload()
        );
    }
}
