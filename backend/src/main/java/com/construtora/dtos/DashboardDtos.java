package com.construtora.dtos;

import java.time.Instant;
import java.util.List;

public class DashboardDtos {

    public record MetricResponse(
            long empreendimentos,
            long usuarios,
            long campanhas
    ) {}

    public record RecentCampaign(
            Long id,
            String titulo,
            String resumo,
            Instant dataCriacao
    ) {}

    public record DashboardResponse(
            MetricResponse metrics,
            List<RecentCampaign> recentes
    ) {}
}
