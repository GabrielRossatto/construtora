package com.construtora.repositories;

import com.construtora.entities.Material;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MaterialRepository extends JpaRepository<Material, Long> {
    List<Material> findByEmpresaId(Long empresaId);
    List<Material> findByEmpresaIdAndEmpreendimento_Id(Long empresaId, Long empreendimentoId);
    Optional<Material> findByIdAndEmpresaId(Long id, Long empresaId);

    @Modifying
    @Query("""
            delete from Material m
            where m.empresaId = :empresaId
              and m.empreendimento.id = :empreendimentoId
            """)
    int deleteAllByEmpresaIdAndEmpreendimentoId(@Param("empresaId") Long empresaId,
                                                @Param("empreendimentoId") Long empreendimentoId);
}
