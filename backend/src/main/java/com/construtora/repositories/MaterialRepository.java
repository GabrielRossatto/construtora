package com.construtora.repositories;

import com.construtora.entities.Material;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MaterialRepository extends JpaRepository<Material, Long> {
    List<Material> findByEmpresaId(Long empresaId);
    List<Material> findByEmpresaIdAndEmpreendimento_Id(Long empresaId, Long empreendimentoId);
    Optional<Material> findByIdAndEmpresaId(Long id, Long empresaId);
    void deleteByEmpresaIdAndEmpreendimento_Id(Long empresaId, Long empreendimentoId);
}
