package com.construtora.repositories;

import com.construtora.entities.IaUsoMensal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface IaUsoMensalRepository extends JpaRepository<IaUsoMensal, String> {
    Optional<IaUsoMensal> findByEmpresaIdAndMes(Long empresaId, LocalDate mes);
}
