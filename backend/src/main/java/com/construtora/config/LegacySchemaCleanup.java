package com.construtora.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class LegacySchemaCleanup implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public LegacySchemaCleanup(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        jdbcTemplate.execute("DROP TABLE IF EXISTS campanha_material");
        jdbcTemplate.execute("DROP TABLE IF EXISTS campanha");
        jdbcTemplate.execute("DROP TABLE IF EXISTS tabela_venda_item");
        jdbcTemplate.execute("DROP TABLE IF EXISTS tabela_venda");
        jdbcTemplate.execute("DELETE up FROM user_permission up JOIN user_account ua ON ua.id = up.user_id JOIN role r ON r.id = ua.role_id WHERE r.name = 'CORRETOR'");
        jdbcTemplate.execute("DELETE rp FROM role_permission rp JOIN role r ON r.id = rp.role_id WHERE r.name = 'CORRETOR'");
        jdbcTemplate.execute("DELETE ua FROM user_account ua JOIN role r ON r.id = ua.role_id WHERE r.name = 'CORRETOR'");
        jdbcTemplate.execute("DELETE FROM role WHERE name = 'CORRETOR'");
        jdbcTemplate.execute("DELETE FROM role_permission WHERE permission_id IN (SELECT id FROM permission WHERE code IN ('CREATE_CAMPAIGN', 'VIEW_CAMPAIGN'))");
        jdbcTemplate.execute("DELETE FROM permission WHERE code IN ('CREATE_CAMPAIGN', 'VIEW_CAMPAIGN')");
    }
}
