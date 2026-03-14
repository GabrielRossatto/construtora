package com.construtora.services;

import com.construtora.dtos.CampanhaDtos;
import com.construtora.entities.Campanha;
import com.construtora.entities.Material;
import com.construtora.repositories.CampanhaRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class CampanhaService {

    private final CampanhaRepository campanhaRepository;
    private final MaterialService materialService;
    private final CurrentSessionService currentSessionService;
    private final AuditService auditService;

    public CampanhaService(CampanhaRepository campanhaRepository,
                           MaterialService materialService,
                           CurrentSessionService currentSessionService,
                           AuditService auditService) {
        this.campanhaRepository = campanhaRepository;
        this.materialService = materialService;
        this.currentSessionService = currentSessionService;
        this.auditService = auditService;
    }

    @Transactional
    public CampanhaDtos.CampanhaResponse create(CampanhaDtos.CreateCampanhaRequest request, HttpServletRequest httpRequest) {
        Set<Material> materiais = new HashSet<>();
        if (request.materialIds() != null) {
            request.materialIds().forEach(id -> materiais.add(materialService.findByIdInTenant(id)));
        }

        Campanha campanha = campanhaRepository.save(Campanha.builder()
                .empresaId(currentSessionService.empresaId())
                .titulo(request.titulo())
                .descricao(request.descricao())
                .materiais(materiais)
                .build());

        auditService.log("CREATE_CAMPAIGN", "CAMPANHA", campanha.getId(), httpRequest.getRemoteAddr());
        return toResponse(campanha);
    }

    public List<CampanhaDtos.CampanhaResponse> list() {
        return campanhaRepository.findByEmpresaIdOrderByDataCriacaoDesc(currentSessionService.empresaId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private CampanhaDtos.CampanhaResponse toResponse(Campanha c) {
        return new CampanhaDtos.CampanhaResponse(
                c.getId(),
                c.getEmpresaId(),
                c.getTitulo(),
                c.getDescricao(),
                c.getMateriais().stream().map(Material::getId).toList(),
                c.getDataCriacao()
        );
    }
}
