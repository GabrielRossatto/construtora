package com.construtora.security;

import lombok.Builder;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;

import java.util.Collection;

@Getter
@Builder
public class AuthUserPrincipal {
    private Long userId;
    private Long empresaId;
    private String email;
    private String role;
    private Collection<? extends GrantedAuthority> authorities;
}
