package com.construtora.services;

import com.construtora.exceptions.ForbiddenException;
import com.construtora.security.AuthUserPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class CurrentSessionService {

    public AuthUserPrincipal currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthUserPrincipal principal)) {
            throw new ForbiddenException("Sessão inválida");
        }
        return principal;
    }

    public Long empresaId() {
        return currentUser().getEmpresaId();
    }
}
