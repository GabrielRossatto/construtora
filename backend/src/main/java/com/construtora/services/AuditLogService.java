package com.construtora.services;

import com.construtora.dtos.AuditDtos;
import com.construtora.repositories.AuditLogRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final CurrentSessionService currentSessionService;

    public AuditLogService(AuditLogRepository auditLogRepository,
                           CurrentSessionService currentSessionService) {
        this.auditLogRepository = auditLogRepository;
        this.currentSessionService = currentSessionService;
    }

    public List<AuditDtos.AuditLogResponse> list() {
        return auditLogRepository.findByEmpresaIdOrderByTimestampDesc(currentSessionService.empresaId())
                .stream()
                .map(l -> new AuditDtos.AuditLogResponse(
                        l.getId(),
                        l.getUsuarioId(),
                        l.getEmpresaId(),
                        l.getAcao(),
                        l.getEntidade(),
                        l.getEntidadeId(),
                        l.getTimestamp(),
                        l.getIp()
                ))
                .toList();
    }
}
