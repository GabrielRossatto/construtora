package com.construtora.services;

import com.construtora.dtos.InstitucionalDtos;
import com.construtora.entities.InstitucionalArquivo;
import com.construtora.exceptions.NotFoundException;
import com.construtora.repositories.InstitucionalArquivoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLConnection;
import java.util.List;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

@Service
public class InstitucionalService {

    private final InstitucionalArquivoRepository institucionalArquivoRepository;
    private final CurrentSessionService currentSessionService;
    private final FileStorageService fileStorageService;

    public InstitucionalService(InstitucionalArquivoRepository institucionalArquivoRepository,
                                CurrentSessionService currentSessionService,
                                FileStorageService fileStorageService) {
        this.institucionalArquivoRepository = institucionalArquivoRepository;
        this.currentSessionService = currentSessionService;
        this.fileStorageService = fileStorageService;
    }

    @Transactional(readOnly = true)
    public List<InstitucionalDtos.InstitucionalArquivoResponse> list() {
        return institucionalArquivoRepository.findByEmpresaIdOrderByDataCriacaoDesc(currentSessionService.empresaId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public InstitucionalDtos.InstitucionalArquivoResponse create(InstitucionalDtos.CreateInstitucionalArquivoRequest request,
                                                                 MultipartFile arquivo) {
        String link = request.link() == null || request.link().isBlank() ? null : request.link().trim();
        if ((arquivo == null || arquivo.isEmpty()) && link == null) {
            throw new ResponseStatusException(BAD_REQUEST, "Informe um arquivo ou um link para o item institucional");
        }

        String arquivoUrl = null;
        String arquivoNome = null;
        if (arquivo != null && !arquivo.isEmpty()) {
            var stored = fileStorageService.upload(currentSessionService.empresaId(), "institucional/arquivos", arquivo);
            arquivoUrl = stored.url();
            arquivoNome = arquivo.getOriginalFilename();
        }

        InstitucionalArquivo entity = institucionalArquivoRepository.save(InstitucionalArquivo.builder()
                .empresaId(currentSessionService.empresaId())
                .titulo(request.titulo().trim())
                .arquivoUrl(arquivoUrl)
                .arquivoNome(arquivoNome)
                .pastaDestino(request.pastaDestino() != null && !request.pastaDestino().isBlank() ? request.pastaDestino().trim() : null)
                .caminhoRelativo(request.caminhoRelativo() != null && !request.caminhoRelativo().isBlank() ? request.caminhoRelativo().trim() : null)
                .linkUrl(link)
                .build());

        return toResponse(entity);
    }

    @Transactional
    public InstitucionalDtos.InstitucionalArquivoResponse update(Long id,
                                                                 InstitucionalDtos.CreateInstitucionalArquivoRequest request,
                                                                 MultipartFile arquivo) {
        InstitucionalArquivo entity = institucionalArquivoRepository.findByIdAndEmpresaId(id, currentSessionService.empresaId())
                .orElseThrow(() -> new NotFoundException("Arquivo institucional não encontrado"));

        String link = request.link() == null || request.link().isBlank() ? null : request.link().trim();
        if ((arquivo == null || arquivo.isEmpty()) && (entity.getArquivoUrl() == null || entity.getArquivoUrl().isBlank()) && link == null) {
            throw new ResponseStatusException(BAD_REQUEST, "Informe um arquivo ou um link para o item institucional");
        }

        if (arquivo != null && !arquivo.isEmpty()) {
            var stored = fileStorageService.upload(currentSessionService.empresaId(), "institucional/arquivos", arquivo);
            entity.setArquivoUrl(stored.url());
            entity.setArquivoNome(arquivo.getOriginalFilename());
        }

        entity.setTitulo(request.titulo().trim());
        entity.setPastaDestino(request.pastaDestino() != null && !request.pastaDestino().isBlank() ? request.pastaDestino().trim() : null);
        entity.setCaminhoRelativo(request.caminhoRelativo() != null && !request.caminhoRelativo().isBlank() ? request.caminhoRelativo().trim() : null);
        entity.setLinkUrl(link);

        return toResponse(institucionalArquivoRepository.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        InstitucionalArquivo entity = institucionalArquivoRepository.findByIdAndEmpresaId(id, currentSessionService.empresaId())
                .orElseThrow(() -> new NotFoundException("Arquivo institucional não encontrado"));
        institucionalArquivoRepository.delete(entity);
    }

    @Transactional
    public void deleteFolder(String pastaDestino) {
        String folder = pastaDestino == null ? "" : pastaDestino.trim();
        if (folder.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "Pasta institucional inválida");
        }

        int deleted = institucionalArquivoRepository.deleteAllByEmpresaIdAndPastaDestino(
                currentSessionService.empresaId(),
                folder
        );

        if (deleted == 0) {
            throw new NotFoundException("Pasta institucional não encontrada");
        }
    }

    @Transactional(readOnly = true)
    public DownloadedInstitucionalArquivo download(Long id) {
        InstitucionalArquivo entity = institucionalArquivoRepository.findByIdAndEmpresaId(id, currentSessionService.empresaId())
                .orElseThrow(() -> new NotFoundException("Arquivo institucional não encontrado"));

        if (entity.getArquivoUrl() == null || entity.getArquivoUrl().isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "Este item institucional não possui arquivo para download");
        }

        try {
            byte[] bytes = fileStorageService.downloadByUrl(entity.getArquivoUrl());
            String contentType = URLConnection.guessContentTypeFromName(entity.getArquivoNome());
            if (contentType == null || contentType.isBlank()) {
                contentType = "application/octet-stream";
            }

            return new DownloadedInstitucionalArquivo(
                    entity.getArquivoNome() == null || entity.getArquivoNome().isBlank() ? "arquivo-institucional" : entity.getArquivoNome(),
                    contentType,
                    bytes
            );
        } catch (Exception e) {
            throw new ResponseStatusException(BAD_REQUEST, "Não foi possível baixar o arquivo institucional");
        }
    }

    private InstitucionalDtos.InstitucionalArquivoResponse toResponse(InstitucionalArquivo entity) {
        return new InstitucionalDtos.InstitucionalArquivoResponse(
                entity.getId(),
                entity.getTitulo(),
                entity.getArquivoUrl(),
                entity.getArquivoNome(),
                entity.getPastaDestino(),
                entity.getCaminhoRelativo(),
                entity.getLinkUrl(),
                entity.getDataCriacao()
        );
    }

    public record DownloadedInstitucionalArquivo(String arquivoNome, String contentType, byte[] bytes) {}
}
