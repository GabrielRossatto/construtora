package com.construtora.services;

import com.construtora.dtos.EmpresaDtos;
import com.construtora.entities.Empresa;
import com.construtora.entities.Role;
import com.construtora.entities.RoleName;
import com.construtora.entities.UserAccount;
import com.construtora.exceptions.BadRequestException;
import com.construtora.repositories.EmpresaRepository;
import com.construtora.repositories.RoleRepository;
import com.construtora.repositories.UserAccountRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class EmpresaService {

    private final EmpresaRepository empresaRepository;
    private final UserAccountRepository userAccountRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final CurrentSessionService currentSessionService;
    private final FileStorageService fileStorageService;

    public EmpresaService(EmpresaRepository empresaRepository,
                          UserAccountRepository userAccountRepository,
                          RoleRepository roleRepository,
                          PasswordEncoder passwordEncoder,
                          CurrentSessionService currentSessionService,
                          FileStorageService fileStorageService) {
        this.empresaRepository = empresaRepository;
        this.userAccountRepository = userAccountRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.currentSessionService = currentSessionService;
        this.fileStorageService = fileStorageService;
    }

    @Transactional
    public EmpresaDtos.EmpresaResponse createEmpresa(EmpresaDtos.CreateEmpresaRequest request) {
        empresaRepository.findByCnpj(request.cnpj()).ifPresent(e -> {
            throw new BadRequestException("CNPJ já cadastrado");
        });

        if (userAccountRepository.findByEmail(request.adminEmail()).isPresent()) {
            throw new BadRequestException("Email do administrador já cadastrado");
        }

        Empresa empresa = empresaRepository.save(Empresa.builder()
                .nome(request.nome())
                .cnpj(request.cnpj())
                .plano(request.plano())
                .build());

        Role adminRole = roleRepository.findByName(RoleName.ADMIN_MASTER)
                .orElseThrow(() -> new BadRequestException("Role ADMIN_MASTER não configurada"));

        userAccountRepository.save(UserAccount.builder()
                .empresaId(empresa.getId())
                .nome(request.adminNome())
                .email(request.adminEmail())
                .telefone(request.adminTelefone())
                .senhaHash(passwordEncoder.encode(request.adminSenha()))
                .role(adminRole)
                .ativo(true)
                .build());

        return toResponse(empresa);
    }

    public EmpresaDtos.EmpresaResponse getMyEmpresa() {
        Long empresaId = currentSessionService.empresaId();
        Empresa empresa = empresaRepository.findById(empresaId)
                .orElseThrow(() -> new BadRequestException("Empresa não encontrada"));
        return toResponse(empresa);
    }

    @Transactional
    public EmpresaDtos.EmpresaResponse updateMyIcon(MultipartFile icone) {
        if (icone == null || icone.isEmpty()) {
            throw new BadRequestException("Ícone obrigatório");
        }

        Long empresaId = currentSessionService.empresaId();
        Empresa empresa = empresaRepository.findById(empresaId)
                .orElseThrow(() -> new BadRequestException("Empresa não encontrada"));

        var stored = fileStorageService.upload(empresaId, "empresa/icone", icone);
        empresa.setIconeUrl(stored.url());
        empresa.setIconeNome(icone.getOriginalFilename());

        return toResponse(empresaRepository.save(empresa));
    }

    private EmpresaDtos.EmpresaResponse toResponse(Empresa empresa) {
        return new EmpresaDtos.EmpresaResponse(
                empresa.getId(),
                empresa.getNome(),
                empresa.getCnpj(),
                empresa.getPlano(),
                empresa.getIconeUrl(),
                empresa.getIconeNome(),
                empresa.getDataCriacao()
        );
    }
}
