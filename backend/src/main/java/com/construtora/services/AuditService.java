package com.construtora.services;

import com.construtora.entities.AuditLog;
import com.construtora.repositories.AuditLogRepository;
import org.springframework.stereotype.Service;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final CurrentSessionService currentSessionService;

    public AuditService(AuditLogRepository auditLogRepository, CurrentSessionService currentSessionService) {
        this.auditLogRepository = auditLogRepository;
        this.currentSessionService = currentSessionService;
    }

    public void log(String acao, String entidade, Long entidadeId, String ip) {
        var principal = currentSessionService.currentUser();
        AuditLog log = AuditLog.builder()
                .usuarioId(principal.getUserId())
                .empresaId(principal.getEmpresaId())
                .acao(acao)
                .entidade(entidade)
                .entidadeId(entidadeId)
                .ip(ip)
                .build();
        auditLogRepository.save(log);
    }
}
