package com.construtora.services;

import com.construtora.dtos.UserDtos;
import com.construtora.entities.Permission;
import com.construtora.entities.Role;
import com.construtora.entities.RoleName;
import com.construtora.entities.UserAccount;
import com.construtora.exceptions.BadRequestException;
import com.construtora.exceptions.NotFoundException;
import com.construtora.repositories.PermissionRepository;
import com.construtora.repositories.RoleRepository;
import com.construtora.repositories.UserAccountRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class UserService {

    private final UserAccountRepository userAccountRepository;
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final PasswordEncoder passwordEncoder;
    private final CurrentSessionService currentSessionService;
    private final AuditService auditService;

    private static final Set<String> MANAGEABLE_PERMISSION_CODES = Set.of(
            "CREATE_DEVELOPMENT",
            "CREATE_USER",
            "CREATE_MATERIAL",
            "CREATE_ENTERPRISE"
    );

    public UserService(UserAccountRepository userAccountRepository,
                       RoleRepository roleRepository,
                       PermissionRepository permissionRepository,
                       PasswordEncoder passwordEncoder,
                       CurrentSessionService currentSessionService,
                       AuditService auditService) {
        this.userAccountRepository = userAccountRepository;
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.passwordEncoder = passwordEncoder;
        this.currentSessionService = currentSessionService;
        this.auditService = auditService;
    }

    @Transactional
    public UserDtos.UserResponse create(UserDtos.CreateUserRequest request, HttpServletRequest httpRequest) {
        String emailNormalizado = normalizarEmail(request.email());
        if (userAccountRepository.findByEmailIgnoreCase(emailNormalizado).isPresent()) {
            throw new BadRequestException("Email já cadastrado");
        }

        Role role = roleRepository.findByName(request.role())
                .orElseThrow(() -> new BadRequestException("Role inválida"));

        Set<Permission> customPermissions = resolveCustomPermissionsForCreate(request.permissionCodes());

        UserAccount user = userAccountRepository.save(UserAccount.builder()
                .empresaId(currentSessionService.empresaId())
                .nome(request.nome())
                .email(emailNormalizado)
                .telefone(request.telefone())
                .cargo(request.cargo())
                .senhaHash(passwordEncoder.encode(request.senha()))
                .role(role)
                .customPermissions(customPermissions)
                .ativo(true)
                .build());

        auditService.log("CREATE_USER", "USER", user.getId(), httpRequest.getRemoteAddr());
        return toResponse(user);
    }

    public List<UserDtos.UserResponse> list() {
        return userAccountRepository.findByEmpresaIdOrderByIdDesc(currentSessionService.empresaId())
                .stream().map(this::toResponse).toList();
    }

    public UserDtos.UserResponse getById(Long id) {
        UserAccount user = userAccountRepository.findByIdAndEmpresaId(id, currentSessionService.empresaId())
                .orElseThrow(() -> new NotFoundException("Usuário não encontrado"));
        return toResponse(user);
    }

    public UserDtos.MyProfileResponse getMyProfile() {
        Long userId = currentSessionService.currentUser().getUserId();
        UserAccount user = userAccountRepository.findByIdAndEmpresaId(userId, currentSessionService.empresaId())
                .orElseThrow(() -> new NotFoundException("Usuário não encontrado"));
        return toMyProfileResponse(user);
    }

    @Transactional
    public UserDtos.MyProfileResponse updateMyProfile(UserDtos.UpdateMyProfileRequest request) {
        Long empresaId = currentSessionService.empresaId();
        Long userId = currentSessionService.currentUser().getUserId();
        UserAccount user = userAccountRepository.findByIdAndEmpresaId(userId, empresaId)
                .orElseThrow(() -> new NotFoundException("Usuário não encontrado"));

        String emailNormalizado = normalizarEmail(request.email());
        userAccountRepository.findByEmailIgnoreCase(emailNormalizado).ifPresent(existing -> {
            if (!existing.getId().equals(user.getId())) {
                throw new BadRequestException("Email já cadastrado");
            }
        });

        user.setNome(request.nome());
        user.setEmail(emailNormalizado);
        user.setTelefone(request.telefone());
        user.setCargo(request.cargo());

        if (request.senha() != null && !request.senha().isBlank()) {
            user.setSenhaHash(passwordEncoder.encode(request.senha()));
        }

        userAccountRepository.save(user);
        return toMyProfileResponse(user);
    }

    private UserDtos.UserResponse toResponse(UserAccount user) {
        return new UserDtos.UserResponse(
                user.getId(),
                user.getEmpresaId(),
                user.getNome(),
                user.getEmail(),
                user.getTelefone(),
                user.getCargo(),
                user.getRole().getName().name(),
                user.getAtivo(),
                user.getCustomPermissions().stream().map(Permission::getCode).sorted().toList()
        );
    }

    private UserDtos.MyProfileResponse toMyProfileResponse(UserAccount user) {
        return new UserDtos.MyProfileResponse(
                user.getId(),
                user.getNome(),
                user.getEmail(),
                user.getTelefone(),
                user.getCargo(),
                user.getRole().getName().name()
        );
    }

    private Set<Permission> resolveCustomPermissionsForCreate(List<String> requestedPermissionCodes) {
        if (requestedPermissionCodes == null || requestedPermissionCodes.isEmpty()) {
            return Set.of();
        }

        String currentRole = currentSessionService.currentUser().getRole();
        if (!"ADMIN_MASTER".equals(currentRole)) {
            throw new BadRequestException("Apenas ADMIN_MASTER pode definir permissões customizadas");
        }

        Set<String> normalizedCodes = requestedPermissionCodes.stream()
                .filter(code -> code != null && !code.isBlank())
                .map(String::trim)
                .collect(java.util.stream.Collectors.toCollection(java.util.LinkedHashSet::new));

        if (!MANAGEABLE_PERMISSION_CODES.containsAll(normalizedCodes)) {
            throw new BadRequestException("Permissões customizadas inválidas");
        }

        List<Permission> permissions = permissionRepository.findByCodeIn(normalizedCodes);
        if (permissions.size() != normalizedCodes.size()) {
            throw new BadRequestException("Uma ou mais permissões não foram encontradas");
        }

        return new HashSet<>(permissions);
    }

    private String normalizarEmail(String email) {
        if (email == null) {
            return "";
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
