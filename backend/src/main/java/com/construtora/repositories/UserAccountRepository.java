package com.construtora.repositories;

import com.construtora.entities.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {
    Optional<UserAccount> findByEmail(String email);
    Optional<UserAccount> findByIdAndEmpresaId(Long id, Long empresaId);

    @Query(value = """
            select ua.*
            from user_account ua
            join role r on r.id = ua.role_id
            where ua.empresa_id = :empresaId
              and r.name <> 'CORRETOR'
            order by ua.id desc
            """, nativeQuery = true)
    List<UserAccount> findVisibleByEmpresaId(Long empresaId);

    @Query(value = """
            select count(*)
            from user_account ua
            join role r on r.id = ua.role_id
            where ua.empresa_id = :empresaId
              and r.name <> 'CORRETOR'
            """, nativeQuery = true)
    long countVisibleByEmpresaId(Long empresaId);

    @Query(value = """
            select count(*)
            from user_account ua
            join role r on r.id = ua.role_id
            where lower(ua.email) = lower(:email)
              and r.name = 'CORRETOR'
            """, nativeQuery = true)
    long countLegacyCorretorByEmail(String email);

    @Modifying
    @Transactional
    @Query(value = """
            update user_account ua
            join role r on r.id = ua.role_id
            set ua.ativo = false
            where r.name = 'CORRETOR'
              and ua.ativo = true
            """, nativeQuery = true)
    int deactivateLegacyCorretorUsers();
}
