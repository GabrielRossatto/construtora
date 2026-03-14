package com.construtora.services;

import com.construtora.dtos.UserDtos;
import com.construtora.entities.Role;
import com.construtora.entities.UserAccount;
import com.construtora.exceptions.BadRequestException;
import com.construtora.exceptions.NotFoundException;
import com.construtora.repositories.RoleRepository;
import com.construtora.repositories.UserAccountRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class UserService {

    private final UserAccountRepository userAccountRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final CurrentSessionService currentSessionService;
    private final AuditService auditService;

    public UserService(UserAccountRepository userAccountRepository,
                       RoleRepository roleRepository,
                       PasswordEncoder passwordEncoder,
                       CurrentSessionService currentSessionService,
                       AuditService auditService) {
        this.userAccountRepository = userAccountRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.currentSessionService = currentSessionService;
        this.auditService = auditService;
    }

    @Transactional
    public UserDtos.UserResponse create(UserDtos.CreateUserRequest request, HttpServletRequest httpRequest) {
        if (userAccountRepository.findByEmail(request.email()).isPresent()) {
            throw new BadRequestException("Email já cadastrado");
        }

        Role role = roleRepository.findByName(request.role())
                .orElseThrow(() -> new BadRequestException("Role inválida"));

        UserAccount user = userAccountRepository.save(UserAccount.builder()
                .empresaId(currentSessionService.empresaId())
                .nome(request.nome())
                .email(request.email())
                .telefone(request.telefone())
                .senhaHash(passwordEncoder.encode(request.senha()))
                .role(role)
                .ativo(true)
                .build());

        auditService.log("CREATE_USER", "USER", user.getId(), httpRequest.getRemoteAddr());
        return toResponse(user);
    }

    public List<UserDtos.UserResponse> list() {
        return userAccountRepository.findByEmpresaId(currentSessionService.empresaId())
                .stream().map(this::toResponse).toList();
    }

    public UserDtos.UserResponse getById(Long id) {
        UserAccount user = userAccountRepository.findByIdAndEmpresaId(id, currentSessionService.empresaId())
                .orElseThrow(() -> new NotFoundException("Usuário não encontrado"));
        return toResponse(user);
    }

    private UserDtos.UserResponse toResponse(UserAccount user) {
        return new UserDtos.UserResponse(
                user.getId(),
                user.getEmpresaId(),
                user.getNome(),
                user.getEmail(),
                user.getTelefone(),
                user.getRole().getName().name(),
                user.getAtivo()
        );
    }
}
