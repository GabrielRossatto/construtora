package com.construtora.dtos;

public class DashboardDtos {

    public record MetricResponse(
            long empreendimentos,
            long usuarios
    ) {}

    public record DashboardResponse(
            MetricResponse metrics
    ) {}
}
