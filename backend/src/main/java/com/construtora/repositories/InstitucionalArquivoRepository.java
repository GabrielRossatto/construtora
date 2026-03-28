package com.construtora.repositories;

import com.construtora.entities.InstitucionalArquivo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InstitucionalArquivoRepository extends JpaRepository<InstitucionalArquivo, Long> {
    List<InstitucionalArquivo> findByEmpresaIdOrderByDataCriacaoDesc(Long empresaId);
    java.util.Optional<InstitucionalArquivo> findByIdAndEmpresaId(Long id, Long empresaId);
}
