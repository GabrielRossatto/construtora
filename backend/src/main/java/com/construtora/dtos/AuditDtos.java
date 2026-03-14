package com.construtora.dtos;

import java.time.Instant;

public class AuditDtos {
    public record AuditLogResponse(
            Long id,
            Long usuarioId,
            Long empresaId,
            String acao,
            String entidade,
            Long entidadeId,
            Instant timestamp,
            String ip
    ) {}
}
