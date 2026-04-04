package com.construtora.repositories;

import com.construtora.entities.InstitucionalArquivo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface InstitucionalArquivoRepository extends JpaRepository<InstitucionalArquivo, Long> {
    List<InstitucionalArquivo> findByEmpresaIdOrderByDataCriacaoDesc(Long empresaId);
    java.util.Optional<InstitucionalArquivo> findByIdAndEmpresaId(Long id, Long empresaId);

    @Modifying
    @Query("""
            delete from InstitucionalArquivo i
            where i.empresaId = :empresaId
              and (
                    i.pastaDestino = :pastaDestino
                    or i.caminhoRelativo like concat(:pastaDestino, '/%')
                  )
            """)
    int deleteAllByEmpresaIdAndPastaDestino(@Param("empresaId") Long empresaId,
                                            @Param("pastaDestino") String pastaDestino);
}
