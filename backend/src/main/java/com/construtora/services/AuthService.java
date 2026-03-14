package com.construtora.services;

import com.construtora.dtos.AuthDtos;
import com.construtora.entities.UserAccount;
import com.construtora.exceptions.ForbiddenException;
import com.construtora.repositories.UserAccountRepository;
import com.construtora.security.JwtTokenService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserAccountRepository userAccountRepository;
    private final JwtTokenService jwtTokenService;

    public AuthService(AuthenticationManager authenticationManager,
                       UserAccountRepository userAccountRepository,
                       JwtTokenService jwtTokenService) {
        this.authenticationManager = authenticationManager;
        this.userAccountRepository = userAccountRepository;
        this.jwtTokenService = jwtTokenService;
    }

    public AuthDtos.LoginResponse login(AuthDtos.LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.senha())
        );

        UserAccount user = userAccountRepository.findByEmail(request.email())
                .orElseThrow(() -> new ForbiddenException("Credenciais inválidas"));

        if (!Boolean.TRUE.equals(user.getAtivo())) {
            throw new ForbiddenException("Usuário inativo");
        }

        List<SimpleGrantedAuthority> authorities = user.getRole().getPermissions().stream()
                .map(p -> new SimpleGrantedAuthority(p.getCode()))
                .toList();

        String token = jwtTokenService.generateToken(
                user.getId(),
                user.getEmpresaId(),
                user.getEmail(),
                user.getRole().getName().name(),
                authorities
        );

        user.setUltimoLogin(Instant.now());
        userAccountRepository.save(user);

        return new AuthDtos.LoginResponse(
                token,
                jwtTokenService.expirationInstant(),
                new AuthDtos.UserSummary(
                        user.getId(),
                        user.getEmpresaId(),
                        user.getNome(),
                        user.getEmail(),
                        user.getRole().getName().name(),
                        authorities.stream().map(SimpleGrantedAuthority::getAuthority).toList()
                )
        );
    }
}
