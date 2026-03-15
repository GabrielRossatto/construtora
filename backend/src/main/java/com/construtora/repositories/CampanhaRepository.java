package com.construtora.repositories;

import com.construtora.entities.Campanha;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CampanhaRepository extends JpaRepository<Campanha, Long> {
    List<Campanha> findByEmpresaIdOrderByDataCriacaoDesc(Long empresaId);
    @Query("""
            select distinct c
            from Campanha c
            join fetch c.materiais m
            where c.empresaId = :empresaId
              and m.empreendimento.id = :empreendimentoId
            order by c.dataCriacao desc
            """)
    List<Campanha> findRelatedToEmpreendimento(@Param("empresaId") Long empresaId,
                                               @Param("empreendimentoId") Long empreendimentoId);
    Optional<Campanha> findByIdAndEmpresaId(Long id, Long empresaId);
    long countByEmpresaId(Long empresaId);

    @Modifying
    @Query(value = """
            delete cm
            from campanha_material cm
            join material m on m.id = cm.material_id
            where m.empresa_id = :empresaId
              and m.empreendimento_id = :empreendimentoId
            """, nativeQuery = true)
    void deleteMaterialLinksByEmpreendimento(@Param("empresaId") Long empresaId,
                                             @Param("empreendimentoId") Long empreendimentoId);
}
