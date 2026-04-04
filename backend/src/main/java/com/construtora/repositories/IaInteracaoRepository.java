package com.construtora.repositories;

import com.construtora.entities.IaInteracao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

public interface IaInteracaoRepository extends JpaRepository<IaInteracao, String> {

    List<IaInteracao> findTop5ByEmpresaIdAndUsuarioIdOrderByCreatedAtDesc(Long empresaId, Long usuarioId);

    List<IaInteracao> findTop20ByEmpresaIdOrderByCreatedAtDesc(Long empresaId);

    List<IaInteracao> findTop20ByEmpresaIdAndUsuarioIdOrderByCreatedAtDesc(Long empresaId, Long usuarioId);

    @Transactional
    long deleteByCreatedAtBefore(Instant cutoff);
}
