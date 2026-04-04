package com.construtora.repositories;

import com.construtora.entities.Empreendimento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EmpreendimentoRepository extends JpaRepository<Empreendimento, Long> {
    List<Empreendimento> findByEmpresaId(Long empresaId);
    Optional<Empreendimento> findByIdAndEmpresaId(Long id, Long empresaId);
    Optional<Empreendimento> findByPublicToken(String publicToken);
    Optional<Empreendimento> findFirstByEmpresaIdOrderByIdAsc(Long empresaId);
    long countByEmpresaId(Long empresaId);
}
