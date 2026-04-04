package com.construtora.repositories;

import com.construtora.entities.TabelaVendasEmpresaConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TabelaVendasEmpresaConfigRepository extends JpaRepository<TabelaVendasEmpresaConfig, Long> {
    Optional<TabelaVendasEmpresaConfig> findByEmpresaId(Long empresaId);
}
