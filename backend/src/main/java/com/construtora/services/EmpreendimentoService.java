package com.construtora.services;

import com.construtora.dtos.EmpreendimentoDtos;
import com.construtora.entities.Empreendimento;
import com.construtora.entities.EmpreendimentoArquivo;
import com.construtora.exceptions.NotFoundException;
import com.construtora.repositories.CampanhaRepository;
import com.construtora.repositories.EmpreendimentoArquivoRepository;
import com.construtora.repositories.EmpreendimentoRepository;
import com.construtora.repositories.MaterialRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@Service
public class EmpreendimentoService {

    private final EmpreendimentoRepository empreendimentoRepository;
    private final EmpreendimentoArquivoRepository empreendimentoArquivoRepository;
    private final MaterialRepository materialRepository;
    private final CampanhaRepository campanhaRepository;
    private final CurrentSessionService currentSessionService;
    private final FileStorageService fileStorageService;
    private final AuditService auditService;

    public EmpreendimentoService(EmpreendimentoRepository empreendimentoRepository,
                                 EmpreendimentoArquivoRepository empreendimentoArquivoRepository,
                                 MaterialRepository materialRepository,
                                 CampanhaRepository campanhaRepository,
                                 CurrentSessionService currentSessionService,
                                 FileStorageService fileStorageService,
                                 AuditService auditService) {
        this.empreendimentoRepository = empreendimentoRepository;
        this.empreendimentoArquivoRepository = empreendimentoArquivoRepository;
        this.materialRepository = materialRepository;
        this.campanhaRepository = campanhaRepository;
        this.currentSessionService = currentSessionService;
        this.fileStorageService = fileStorageService;
        this.auditService = auditService;
    }

    @Transactional
    public EmpreendimentoDtos.EmpreendimentoResponse create(EmpreendimentoDtos.CreateEmpreendimentoRequest request) {
        return create(request, null);
    }

    @Transactional
    public EmpreendimentoDtos.EmpreendimentoResponse create(EmpreendimentoDtos.CreateEmpreendimentoRequest request,
                                                            MultipartFile fotoPerfil) {
        String fotoPerfilUrl = request.fotoPerfilUrl();
        if (fotoPerfil != null && !fotoPerfil.isEmpty()) {
            FileStorageService.StoredFile stored = fileStorageService.upload(currentSessionService.empresaId(), "empreendimentos/perfil", fotoPerfil);
            fotoPerfilUrl = stored.url();
        }

        Empreendimento e = empreendimentoRepository.save(Empreendimento.builder()
                .empresaId(currentSessionService.empresaId())
                .nome(request.nome())
                .descricao(request.descricao())
                .fotoPerfilUrl(fotoPerfilUrl)
                .publicToken(generatePublicToken())
                .build());
        return toResponse(e);
    }

    public List<EmpreendimentoDtos.EmpreendimentoResponse> list() {
        Long empresaId = currentSessionService.empresaId();
        return empreendimentoRepository.findByEmpresaId(empresaId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public EmpreendimentoDtos.EmpreendimentoResponse update(Long id,
                                                            EmpreendimentoDtos.UpdateEmpreendimentoRequest request,
                                                            HttpServletRequest httpRequest) {
        Empreendimento e = empreendimentoRepository.findByIdAndEmpresaId(id, currentSessionService.empresaId())
                .orElseThrow(() -> new NotFoundException("Empreendimento não encontrado"));

        e.setNome(request.nome());
        e.setDescricao(request.descricao());
        e.setFotoPerfilUrl(request.fotoPerfilUrl());
        if (e.getPublicToken() == null || e.getPublicToken().isBlank()) {
            e.setPublicToken(generatePublicToken());
        }
        empreendimentoRepository.save(e);

        auditService.log("UPDATE_DEVELOPMENT", "EMPREENDIMENTO", e.getId(), httpRequest.getRemoteAddr());
        return toResponse(e);
    }

    @Transactional
    public EmpreendimentoDtos.EmpreendimentoArquivoResponse uploadArquivo(Long empreendimentoId,
                                                                          MultipartFile file,
                                                                          HttpServletRequest httpRequest) {
        Long empresaId = currentSessionService.empresaId();
        Empreendimento empreendimento = empreendimentoRepository.findByIdAndEmpresaId(empreendimentoId, empresaId)
                .orElseThrow(() -> new NotFoundException("Empreendimento não encontrado"));

        FileStorageService.StoredFile stored = fileStorageService.upload(empresaId, "empreendimentos", file);

        EmpreendimentoArquivo arquivo = empreendimentoArquivoRepository.save(EmpreendimentoArquivo.builder()
                .empresaId(empresaId)
                .empreendimento(empreendimento)
                .url(stored.url())
                .tipo(stored.contentType())
                .tamanhoBytes(stored.size())
                .build());

        auditService.log("UPLOAD_DEVELOPMENT_FILE", "EMPREENDIMENTO_ARQUIVO", arquivo.getId(), httpRequest.getRemoteAddr());
        return new EmpreendimentoDtos.EmpreendimentoArquivoResponse(
                arquivo.getId(),
                arquivo.getUrl(),
                arquivo.getTipo(),
                arquivo.getTamanhoBytes(),
                arquivo.getDataUpload()
        );
    }

    @Transactional
    public void delete(Long id, HttpServletRequest httpRequest) {
        Long empresaId = currentSessionService.empresaId();
        Empreendimento empreendimento = empreendimentoRepository.findByIdAndEmpresaId(id, empresaId)
                .orElseThrow(() -> new NotFoundException("Empreendimento não encontrado"));

        campanhaRepository.deleteMaterialLinksByEmpreendimento(empresaId, id);
        materialRepository.deleteByEmpresaIdAndEmpreendimento_Id(empresaId, id);
        empreendimentoArquivoRepository.deleteByEmpresaIdAndEmpreendimentoId(empresaId, id);
        empreendimentoRepository.delete(empreendimento);

        auditService.log("DELETE_DEVELOPMENT", "EMPREENDIMENTO", empreendimento.getId(), httpRequest.getRemoteAddr());
    }

    private EmpreendimentoDtos.EmpreendimentoResponse toResponse(Empreendimento e) {
        if (e.getPublicToken() == null || e.getPublicToken().isBlank()) {
            e.setPublicToken(generatePublicToken());
            empreendimentoRepository.save(e);
        }

        Long empresaId = currentSessionService.empresaId();
        List<EmpreendimentoDtos.EmpreendimentoArquivoResponse> arquivos =
                empreendimentoArquivoRepository.findByEmpresaIdAndEmpreendimentoId(empresaId, e.getId()).stream()
                        .map(a -> new EmpreendimentoDtos.EmpreendimentoArquivoResponse(
                                a.getId(), a.getUrl(), a.getTipo(), a.getTamanhoBytes(), a.getDataUpload()
                        ))
                        .toList();

        return new EmpreendimentoDtos.EmpreendimentoResponse(
                e.getId(),
                e.getEmpresaId(),
                e.getPublicToken(),
                e.getNome(),
                e.getDescricao(),
                e.getFotoPerfilUrl(),
                e.getDataCriacao(),
                arquivos
        );
    }

    private String generatePublicToken() {
        return UUID.randomUUID().toString().replace("-", "");
    }
}
