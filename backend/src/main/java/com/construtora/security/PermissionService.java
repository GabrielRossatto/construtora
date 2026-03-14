package com.construtora.security;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component("permissionService")
public class PermissionService {

    public boolean hasPermission(Authentication authentication, String permission) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        return authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals(permission));
    }
}
