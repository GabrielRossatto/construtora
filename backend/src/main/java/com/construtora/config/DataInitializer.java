package com.construtora.config;

import com.construtora.entities.Permission;
import com.construtora.entities.Role;
import com.construtora.entities.RoleName;
import com.construtora.repositories.PermissionRepository;
import com.construtora.repositories.RoleRepository;
import com.construtora.repositories.UserAccountRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;
import java.util.Set;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner seedRbac(PermissionRepository permissionRepository,
                               RoleRepository roleRepository,
                               UserAccountRepository userAccountRepository) {
        return args -> {
            List<String> permissions = List.of(
                    "CREATE_USER", "VIEW_USER",
                    "CREATE_ENTERPRISE", "VIEW_ENTERPRISE",
                    "CREATE_MATERIAL", "VIEW_MATERIAL",
                    "CREATE_CAMPAIGN", "VIEW_CAMPAIGN",
                    "CREATE_DEVELOPMENT", "VIEW_DEVELOPMENT",
                    "UPLOAD_FILE"
            );

            for (String code : permissions) {
                permissionRepository.findByCode(code).orElseGet(() ->
                        permissionRepository.save(Permission.builder()
                                .code(code)
                                .description("Permission " + code)
                                .build())
                );
            }

            createOrUpdateRole(roleRepository, permissionRepository, RoleName.ADMIN_MASTER, "Acesso total", permissions);
            createOrUpdateRole(roleRepository, permissionRepository, RoleName.TIME_COMERCIAL, "Operação comercial", List.of(
                    "CREATE_USER", "VIEW_USER",
                    "CREATE_DEVELOPMENT", "VIEW_DEVELOPMENT",
                    "CREATE_MATERIAL", "VIEW_MATERIAL",
                    "VIEW_CAMPAIGN", "UPLOAD_FILE"
            ));

            userAccountRepository.deactivateLegacyCorretorUsers();
        };
    }

    private void createOrUpdateRole(RoleRepository roleRepository,
                                    PermissionRepository permissionRepository,
                                    RoleName roleName,
                                    String description,
                                    List<String> permissions) {
        Role role = roleRepository.findByName(roleName)
                .orElseGet(() -> Role.builder().name(roleName).description(description).build());

        Set<Permission> permissionSet = permissions.stream()
                .map(code -> permissionRepository.findByCode(code).orElseThrow())
                .collect(java.util.stream.Collectors.toSet());

        role.setDescription(description);
        role.setPermissions(permissionSet);
        roleRepository.save(role);
    }
}
