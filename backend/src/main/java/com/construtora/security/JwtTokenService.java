package com.construtora.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collection;
import java.util.Date;
import java.util.List;

@Service
public class JwtTokenService {

    private final SecretKey signingKey;
    private final long expirationMinutes;

    public JwtTokenService(@Value("${app.jwt.secret}") String secret,
                           @Value("${app.jwt.expiration-minutes}") long expirationMinutes) {
        this.signingKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(ensureBase64(secret)));
        this.expirationMinutes = expirationMinutes;
    }

    public Instant expirationInstant() {
        return Instant.now().plus(expirationMinutes, ChronoUnit.MINUTES);
    }

    public String generateToken(Long userId, Long empresaId, String email, String role, Collection<? extends GrantedAuthority> authorities) {
        Instant exp = expirationInstant();
        List<String> permissions = authorities.stream().map(GrantedAuthority::getAuthority).toList();
        return Jwts.builder()
                .subject(email)
                .claim("uid", userId)
                .claim("empresa_id", empresaId)
                .claim("role", role)
                .claim("permissions", permissions)
                .issuedAt(new Date())
                .expiration(Date.from(exp))
                .signWith(signingKey)
                .compact();
    }

    public Jws<Claims> parse(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token);
    }

    private String ensureBase64(String value) {
        try {
            Decoders.BASE64.decode(value);
            return value;
        } catch (Exception ignored) {
            return java.util.Base64.getEncoder().encodeToString(value.getBytes());
        }
    }
}
