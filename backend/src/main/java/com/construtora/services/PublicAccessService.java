package com.construtora.services;

import com.construtora.dtos.PublicDtos;
import com.construtora.entities.Empreendimento;
import com.construtora.entities.Material;
import com.construtora.exceptions.NotFoundException;
import com.construtora.repositories.EmpreendimentoRepository;
import com.construtora.repositories.MaterialRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class PublicAccessService {

    private final EmpreendimentoRepository empreendimentoRepository;
    private final MaterialRepository materialRepository;
    private final FileStorageService fileStorageService;

    public PublicAccessService(EmpreendimentoRepository empreendimentoRepository,
                               MaterialRepository materialRepository,
                               FileStorageService fileStorageService) {
        this.empreendimentoRepository = empreendimentoRepository;
        this.materialRepository = materialRepository;
        this.fileStorageService = fileStorageService;
    }

    @Transactional(readOnly = true)
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
                        m.getPastaDestino(),
                        m.getCaminhoRelativo(),
                        m.getDescricao(),
                        m.getTamanhoBytes(),
                        m.getDataUpload()
                ))
                .toList();

        PublicDtos.PublicLocalizacao localizacao = empreendimento.getLocalizacao() == null
                ? null
                : new PublicDtos.PublicLocalizacao(
                empreendimento.getLocalizacao().getLogradouro(),
                empreendimento.getLocalizacao().getNumero(),
                empreendimento.getLocalizacao().getComplemento(),
                empreendimento.getLocalizacao().getBairro(),
                empreendimento.getLocalizacao().getCidade(),
                empreendimento.getLocalizacao().getEstado()
        );

        var tipos = empreendimento.getTipos().stream()
                .map(tipo -> new PublicDtos.PublicTipoItem(
                        tipo.getTitulo(),
                        tipo.getAreaMetragem(),
                        tipo.getQuantidadeSuites(),
                        tipo.getQuantidadeVagas(),
                        tipo.getUnidades().stream()
                                .map(unidade -> new PublicDtos.PublicTipoUnidadeItem(
                                        unidade.getCodigoUnidade(),
                                        unidade.getTipoValor(),
                                        unidade.getValor()
                                ))
                                .toList()
                ))
                .toList();

        return new PublicDtos.PublicEmpreendimentoMateriaisResponse(
                empreendimento.getId(),
                empreendimento.getNome(),
                empreendimento.getFotoPerfilUrl(),
                empreendimento.getDescricao(),
                localizacao,
                tipos,
                empreendimento.getMetragemLazer(),
                empreendimento.getDescricaoLazer(),
                empreendimento.getPercentualObra(),
                new PublicDtos.PublicCondicoesPagamento(
                        empreendimento.getEntradaTipo(),
                        empreendimento.getEntradaValor(),
                        empreendimento.getSaldoPagamento(),
                        empreendimento.getReforcosPagamento()
                ),
                empreendimento.getDataInicioObra(),
                empreendimento.getDataReferenciaTabelaVendas(),
                empreendimento.getDataEntrega(),
                materiais
        );
    }

    @Transactional(readOnly = true)
    public DownloadedPublicZip downloadMateriaisZip(String publicToken) {
        Empreendimento empreendimento = empreendimentoRepository.findByPublicToken(publicToken)
                .orElseThrow(() -> new NotFoundException("Link público inválido"));

        var materiais = materialRepository.findByEmpresaIdAndEmpreendimento_Id(
                empreendimento.getEmpresaId(),
                empreendimento.getId()
        );

        if (materiais.isEmpty()) {
            throw new NotFoundException("Nenhum material público disponível para download");
        }

        try (var output = new ByteArrayOutputStream();
             var zip = new ZipOutputStream(output)) {
            Set<String> usedNames = new LinkedHashSet<>();

            for (Material material : materiais) {
                if (material.getArquivoUrl() == null || material.getArquivoUrl().isBlank()) {
                    continue;
                }

                String entryName = buildUniqueEntryName(material, usedNames);
                zip.putNextEntry(new ZipEntry(entryName));

                zip.write(fileStorageService.downloadByUrl(material.getArquivoUrl()));

                zip.closeEntry();
            }

            zip.finish();
            return new DownloadedPublicZip(
                    sanitizeFileName(empreendimento.getNome()) + "-artes-comerciais.zip",
                    output.toByteArray()
            );
        } catch (IOException e) {
            throw new NotFoundException("Não foi possível preparar o pacote de materiais");
        }
    }

    @Transactional(readOnly = true)
    public DownloadedPublicZip downloadMateriaisFolderZip(String publicToken, String pastaDestino) {
        Empreendimento empreendimento = empreendimentoRepository.findByPublicToken(publicToken)
                .orElseThrow(() -> new NotFoundException("Link público inválido"));

        var materiais = materialRepository.findByEmpresaIdAndEmpreendimento_Id(
                empreendimento.getEmpresaId(),
                empreendimento.getId()
        ).stream()
                .filter(material -> pastaDestino.equals(material.getPastaDestino()))
                .toList();

        if (materiais.isEmpty()) {
            throw new NotFoundException("Nenhuma pasta pública disponível para download");
        }

        return buildZip(
                materiais,
                sanitizeFileName(empreendimento.getNome()) + "-" + sanitizeFileName(pastaDestino) + ".zip"
        );
    }

    private DownloadedPublicZip buildZip(List<Material> materiais, String zipName) {
        try (var output = new ByteArrayOutputStream();
             var zip = new ZipOutputStream(output)) {
            Set<String> usedNames = new LinkedHashSet<>();

            for (Material material : materiais) {
                if (material.getArquivoUrl() == null || material.getArquivoUrl().isBlank()) {
                    continue;
                }

                String entryName = buildUniqueEntryName(material, usedNames);
                zip.putNextEntry(new ZipEntry(entryName));

                zip.write(fileStorageService.downloadByUrl(material.getArquivoUrl()));

                zip.closeEntry();
            }

            zip.finish();
            return new DownloadedPublicZip(zipName, output.toByteArray());
        } catch (IOException e) {
            throw new NotFoundException("Não foi possível preparar o pacote de materiais");
        }
    }

    private String buildUniqueEntryName(Material material, Set<String> usedNames) {
        String base = sanitizeFileName(material.getCaminhoRelativo() != null && !material.getCaminhoRelativo().isBlank()
                ? material.getCaminhoRelativo()
                : material.getTitulo());
        String extension = "";
        String url = material.getArquivoUrl();
        int dotIndex = url != null ? url.lastIndexOf('.') : -1;
        if (dotIndex >= 0 && dotIndex < url.length() - 1) {
            extension = url.substring(dotIndex);
            int queryIndex = extension.indexOf('?');
            if (queryIndex >= 0) {
                extension = extension.substring(0, queryIndex);
            }
            if (extension.length() > 8) {
                extension = "";
            }
        }

        String candidate = base.endsWith(extension) ? base : base + extension;
        int counter = 2;
        while (!usedNames.add(candidate)) {
            candidate = base + "-" + counter + extension;
            counter++;
        }
        return candidate;
    }

    private String sanitizeFileName(String value) {
        String normalized = (value == null || value.isBlank()) ? "material" : value;
        return normalized
                .replace('\\', '/')
                .replaceAll("[:*?\"<>|]+", " ")
                .replaceAll("\\s+", " ")
                .replaceAll("/+", "/")
                .trim();
    }

    public record DownloadedPublicZip(String fileName, byte[] bytes) {}
}
