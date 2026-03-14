package com.construtora.services;

import com.construtora.dtos.PublicDtos;
import com.construtora.entities.Empreendimento;
import com.construtora.exceptions.NotFoundException;
import com.construtora.repositories.CampanhaRepository;
import com.construtora.repositories.EmpreendimentoRepository;
import com.construtora.repositories.MaterialRepository;
import org.springframework.stereotype.Service;

@Service
public class PublicAccessService {

    private final EmpreendimentoRepository empreendimentoRepository;
    private final MaterialRepository materialRepository;
    private final CampanhaRepository campanhaRepository;

    public PublicAccessService(EmpreendimentoRepository empreendimentoRepository,
                               MaterialRepository materialRepository,
                               CampanhaRepository campanhaRepository) {
        this.empreendimentoRepository = empreendimentoRepository;
        this.materialRepository = materialRepository;
        this.campanhaRepository = campanhaRepository;
    }

    public PublicDtos.PublicEmpreendimentoMateriaisResponse getMateriaisByPublicToken(String publicToken) {
        Empreendimento empreendimento = empreendimentoRepository.findByPublicToken(publicToken)
                .orElseThrow(() -> new NotFoundException("Link público inválido"));

        var materiais = materialRepository.findByEmpresaIdAndEmpreendimento_Id(
                        empreendimento.getEmpresaId(),
                        empreendimento.getId()
                ).stream()
                .map(m -> new PublicDtos.PublicMaterialItem(
                        m.getId(),
                        m.getTitulo(),
                        m.getTipoArquivo(),
                        m.getArquivoUrl(),
                        m.getDescricao(),
                        m.getTamanhoBytes(),
                        m.getDataUpload()
                ))
                .toList();

        var campanhas = campanhaRepository.findRelatedToEmpreendimento(
                        empreendimento.getEmpresaId(),
                        empreendimento.getId()
                ).stream()
                .map(c -> new PublicDtos.PublicCampanhaItem(
                        c.getId(),
                        c.getTitulo(),
                        c.getDescricao(),
                        c.getDataCriacao(),
                        c.getMateriais() != null ? c.getMateriais().size() : 0
                ))
                .toList();

        return new PublicDtos.PublicEmpreendimentoMateriaisResponse(
                empreendimento.getId(),
                empreendimento.getNome(),
                empreendimento.getFotoPerfilUrl(),
                materiais,
                campanhas
        );
    }
}
