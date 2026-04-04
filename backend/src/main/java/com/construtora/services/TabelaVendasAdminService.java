package com.construtora.services;

import com.construtora.dtos.TabelaVendasAdminDtos;
import com.construtora.entities.Empresa;
import com.construtora.entities.ModeloTabelaTema;
import com.construtora.entities.TabelaVendasEmpresaConfig;
import com.construtora.exceptions.NotFoundException;
import com.construtora.repositories.EmpreendimentoRepository;
import com.construtora.repositories.EmpresaRepository;
import com.construtora.repositories.TabelaVendasEmpresaConfigRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class TabelaVendasAdminService {

    private final EmpresaRepository empresaRepository;
    private final EmpreendimentoRepository empreendimentoRepository;
    private final TabelaVendasEmpresaConfigRepository tabelaVendasEmpresaConfigRepository;

    public TabelaVendasAdminService(EmpresaRepository empresaRepository,
                                    EmpreendimentoRepository empreendimentoRepository,
                                    TabelaVendasEmpresaConfigRepository tabelaVendasEmpresaConfigRepository) {
        this.empresaRepository = empresaRepository;
        this.empreendimentoRepository = empreendimentoRepository;
        this.tabelaVendasEmpresaConfigRepository = tabelaVendasEmpresaConfigRepository;
    }

    @Transactional(readOnly = true)
    public List<TabelaVendasAdminDtos.EmpresaResumo> listarEmpresas() {
        return empresaRepository.findAll(Sort.by(Sort.Direction.ASC, "nome")).stream()
                .map(empresa -> new TabelaVendasAdminDtos.EmpresaResumo(
                        empresa.getId(),
                        empresa.getNome(),
                        empresa.getCnpj(),
                        empreendimentoRepository.findFirstByEmpresaIdOrderByIdAsc(empresa.getId())
                                .map(e -> e.getPublicToken())
                                .orElse(null)
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public TabelaVendasAdminDtos.TabelaVendasConfigResponse obterConfig(Long empresaId) {
        Empresa empresa = empresaRepository.findById(empresaId)
                .orElseThrow(() -> new NotFoundException("Empresa não encontrada"));
        TabelaVendasEmpresaConfig config = tabelaVendasEmpresaConfigRepository.findByEmpresaId(empresaId)
                .orElseGet(() -> defaultConfig(empresaId));
        return toResponse(empresa, config);
    }

    @Transactional
    public TabelaVendasAdminDtos.TabelaVendasConfigResponse salvarConfig(Long empresaId,
                                                                         TabelaVendasAdminDtos.TabelaVendasConfigRequest request) {
        Empresa empresa = empresaRepository.findById(empresaId)
                .orElseThrow(() -> new NotFoundException("Empresa não encontrada"));

        TabelaVendasEmpresaConfig entity = tabelaVendasEmpresaConfigRepository.findByEmpresaId(empresaId)
                .orElseGet(() -> defaultConfig(empresaId));
        entity.setTema(request.tema());
        entity.setCorPrimaria(normalizeColor(request.corPrimaria()));
        entity.setCorSecundaria(normalizeColor(request.corSecundaria()));
        entity.setCorTexto(normalizeColor(request.corTexto()));
        entity.setCorFundo(normalizeColor(request.corFundo()));
        entity.setTextoRodape(blank(request.textoRodape()));
        entity.setExibirEndereco(request.exibirEndereco());
        entity.setExibirIcone(request.exibirIcone());
        entity.setPagamentoEmDestaque(request.pagamentoEmDestaque());
        entity.setLarguraColunaLateralPx(clamp(request.larguraColunaLateralPx(), 320, 700, 450));
        entity.setAlturaImagemPercentual(clamp(request.alturaImagemPercentual(), 40, 85, 70));
        entity.setDivisaoInferiorPercentual(clamp(request.divisaoInferiorPercentual(), 25, 75, 50));

        TabelaVendasEmpresaConfig saved = tabelaVendasEmpresaConfigRepository.save(entity);
        return toResponse(empresa, saved);
    }

    private TabelaVendasEmpresaConfig defaultConfig(Long empresaId) {
        return TabelaVendasEmpresaConfig.builder()
                .empresaId(empresaId)
                .tema(ModeloTabelaTema.CLASSICO)
                .exibirEndereco(true)
                .exibirIcone(true)
                .pagamentoEmDestaque(true)
                .build();
    }

    private TabelaVendasAdminDtos.TabelaVendasConfigResponse toResponse(Empresa empresa, TabelaVendasEmpresaConfig config) {
        return new TabelaVendasAdminDtos.TabelaVendasConfigResponse(
                empresa.getId(),
                empresa.getNome(),
                empresa.getCnpj(),
                empreendimentoRepository.findFirstByEmpresaIdOrderByIdAsc(empresa.getId())
                        .map(e -> e.getPublicToken())
                        .orElse(null),
                config.getTema(),
                config.getCorPrimaria(),
                config.getCorSecundaria(),
                config.getCorTexto(),
                config.getCorFundo(),
                config.getTextoRodape(),
                config.getExibirEndereco(),
                config.getExibirIcone(),
                config.getPagamentoEmDestaque(),
                config.getLarguraColunaLateralPx(),
                config.getAlturaImagemPercentual(),
                config.getDivisaoInferiorPercentual()
        );
    }

    private Integer clamp(Integer value, int min, int max, int fallback) {
        if (value == null) {
            return fallback;
        }
        return Math.max(min, Math.min(max, value));
    }

    private String normalizeColor(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.startsWith("#") ? value.toUpperCase() : ("#" + value.toUpperCase());
    }

    private String blank(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
