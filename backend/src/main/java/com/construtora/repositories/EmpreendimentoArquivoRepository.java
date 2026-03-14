package com.construtora.repositories;

import com.construtora.entities.EmpreendimentoArquivo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmpreendimentoArquivoRepository extends JpaRepository<EmpreendimentoArquivo, Long> {
    List<EmpreendimentoArquivo> findByEmpresaIdAndEmpreendimentoId(Long empresaId, Long empreendimentoId);
}
