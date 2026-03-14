package com.construtora.services;

import com.construtora.dtos.DashboardDtos;
import com.construtora.repositories.CampanhaRepository;
import com.construtora.repositories.EmpreendimentoRepository;
import com.construtora.repositories.UserAccountRepository;
import org.springframework.stereotype.Service;

@Service
public class DashboardService {

    private final CurrentSessionService currentSessionService;
    private final EmpreendimentoRepository empreendimentoRepository;
    private final UserAccountRepository userAccountRepository;
    private final CampanhaRepository campanhaRepository;

    public DashboardService(CurrentSessionService currentSessionService,
                            EmpreendimentoRepository empreendimentoRepository,
                            UserAccountRepository userAccountRepository,
                            CampanhaRepository campanhaRepository) {
        this.currentSessionService = currentSessionService;
        this.empreendimentoRepository = empreendimentoRepository;
        this.userAccountRepository = userAccountRepository;
        this.campanhaRepository = campanhaRepository;
    }

    public DashboardDtos.DashboardResponse getDashboard() {
        Long empresaId = currentSessionService.empresaId();

        DashboardDtos.MetricResponse metrics = new DashboardDtos.MetricResponse(
                empreendimentoRepository.countByEmpresaId(empresaId),
                userAccountRepository.countByEmpresaId(empresaId),
                campanhaRepository.countByEmpresaId(empresaId)
        );

        var recentes = campanhaRepository.findByEmpresaIdOrderByDataCriacaoDesc(empresaId).stream()
                .limit(5)
                .map(c -> new DashboardDtos.RecentCampaign(c.getId(), c.getTitulo(), c.getDescricao(), c.getDataCriacao()))
                .toList();

        return new DashboardDtos.DashboardResponse(metrics, recentes);
    }
}
