package com.construtora.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenService jwtTokenService;

    public JwtAuthenticationFilter(JwtTokenService jwtTokenService) {
        this.jwtTokenService = jwtTokenService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String auth = request.getHeader(HttpHeaders.AUTHORIZATION);
            if (auth != null && auth.startsWith("Bearer ")) {
                String token = auth.substring(7);
                Jws<Claims> claimsJws = jwtTokenService.parse(token);
                Claims claims = claimsJws.getPayload();

                Long userId = claims.get("uid", Number.class).longValue();
                Long empresaId = claims.get("empresa_id", Number.class).longValue();
                String email = claims.getSubject();
                String role = claims.get("role", String.class);

                List<String> permissions = claims.get("permissions", List.class);
                List<SimpleGrantedAuthority> authorities = new ArrayList<>();
                if (permissions != null) {
                    permissions.forEach(p -> authorities.add(new SimpleGrantedAuthority(p)));
                }
                authorities.add(new SimpleGrantedAuthority("ROLE_" + role));

                AuthUserPrincipal principal = AuthUserPrincipal.builder()
                        .userId(userId)
                        .empresaId(empresaId)
                        .email(email)
                        .role(role)
                        .authorities(authorities)
                        .build();

                TenantContext.setEmpresaId(empresaId);

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(principal, null, authorities);
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }
}
