package com.construtora.services;

import com.construtora.dtos.AuthDtos;
import com.construtora.entities.Permission;
import com.construtora.entities.UserAccount;
import com.construtora.exceptions.ForbiddenException;
import com.construtora.repositories.UserAccountRepository;
import com.construtora.security.JwtTokenService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.stream.Stream;

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
        if (userAccountRepository.countLegacyCorretorByEmail(request.email()) > 0) {
            throw new ForbiddenException("Perfil de corretor não possui mais acesso");
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email(), request.senha())
            );
        } catch (AuthenticationException ex) {
            throw new ForbiddenException("Credenciais inválidas");
        }

        UserAccount user = userAccountRepository.findByEmail(request.email())
                .orElseThrow(() -> new ForbiddenException("Credenciais inválidas"));

        if (!Boolean.TRUE.equals(user.getAtivo())) {
            throw new ForbiddenException("Usuário inativo");
        }

        List<SimpleGrantedAuthority> authorities = Stream.concat(
                        user.getRole().getPermissions().stream(),
                        user.getCustomPermissions().stream()
                )
                .map(Permission::getCode)
                .distinct()
                .map(SimpleGrantedAuthority::new)
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
