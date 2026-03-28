package com.construtora.services;

import com.construtora.dtos.DashboardDtos;
import com.construtora.repositories.EmpreendimentoRepository;
import com.construtora.repositories.UserAccountRepository;
import org.springframework.stereotype.Service;

@Service
public class DashboardService {

    private final CurrentSessionService currentSessionService;
    private final EmpreendimentoRepository empreendimentoRepository;
    private final UserAccountRepository userAccountRepository;

    public DashboardService(CurrentSessionService currentSessionService,
                            EmpreendimentoRepository empreendimentoRepository,
                            UserAccountRepository userAccountRepository) {
        this.currentSessionService = currentSessionService;
        this.empreendimentoRepository = empreendimentoRepository;
        this.userAccountRepository = userAccountRepository;
    }

    public DashboardDtos.DashboardResponse getDashboard() {
        Long empresaId = currentSessionService.empresaId();

        DashboardDtos.MetricResponse metrics = new DashboardDtos.MetricResponse(
                empreendimentoRepository.countByEmpresaId(empresaId),
                userAccountRepository.countVisibleByEmpresaId(empresaId)
        );

        return new DashboardDtos.DashboardResponse(metrics);
    }
}
