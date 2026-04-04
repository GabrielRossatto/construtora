package com.construtora.services;

import com.construtora.exceptions.ForbiddenException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class InternalAdminAccessService {

    private final CurrentSessionService currentSessionService;
    private final Set<String> allowedEmails;

    public InternalAdminAccessService(CurrentSessionService currentSessionService,
                                      @Value("${app.internal-admin-emails:admin.teste.20260328090502@construtora.local,dasdasdosdos1212@gmail.com}") String allowedEmailsRaw) {
        this.currentSessionService = currentSessionService;
        this.allowedEmails = Arrays.stream(allowedEmailsRaw.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(value -> value.toLowerCase(Locale.ROOT))
                .collect(Collectors.toSet());
    }

    public void ensureInternalAdmin() {
        String email = currentSessionService.currentUser().getEmail();
        if (email == null || !allowedEmails.contains(email.toLowerCase(Locale.ROOT))) {
            throw new ForbiddenException("Acesso restrito ao backoffice interno");
        }
    }
}
