CREATE TABLE tabela_vendas_empresa_config (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    empresa_id BIGINT NOT NULL UNIQUE,
    tema VARCHAR(30) NOT NULL DEFAULT 'CLASSICO',
    cor_primaria VARCHAR(7) NULL,
    cor_secundaria VARCHAR(7) NULL,
    cor_texto VARCHAR(7) NULL,
    cor_fundo VARCHAR(7) NULL,
    texto_rodape VARCHAR(255) NULL,
    exibir_endereco TINYINT(1) NOT NULL DEFAULT 1,
    exibir_icone TINYINT(1) NOT NULL DEFAULT 1,
    pagamento_em_destaque TINYINT(1) NOT NULL DEFAULT 1,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_tabela_vendas_config_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id)
);
