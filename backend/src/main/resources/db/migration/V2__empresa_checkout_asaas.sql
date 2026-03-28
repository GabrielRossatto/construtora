CREATE TABLE empresa_cadastro (
    id BIGINT NOT NULL AUTO_INCREMENT,
    public_token VARCHAR(40) NOT NULL,
    nome VARCHAR(140) NOT NULL,
    cnpj VARCHAR(18) NOT NULL,
    plano VARCHAR(20) NOT NULL,
    pagamento_forma VARCHAR(30) NOT NULL,
    admin_nome VARCHAR(140) NOT NULL,
    admin_email VARCHAR(150) NOT NULL,
    admin_telefone VARCHAR(30) NULL,
    admin_senha_raw VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL,
    asaas_checkout_id VARCHAR(80) NULL,
    asaas_checkout_url VARCHAR(500) NULL,
    asaas_customer_id VARCHAR(80) NULL,
    asaas_subscription_id VARCHAR(80) NULL,
    asaas_payment_id VARCHAR(80) NULL,
    ultimo_evento_id VARCHAR(80) NULL,
    observacoes TEXT NULL,
    empresa_id BIGINT NULL,
    data_criacao DATETIME(6) NOT NULL,
    data_atualizacao DATETIME(6) NOT NULL,
    data_conclusao DATETIME(6) NULL,
    CONSTRAINT pk_empresa_cadastro PRIMARY KEY (id),
    CONSTRAINT uk_empresa_cadastro_public_token UNIQUE (public_token),
    CONSTRAINT fk_empresa_cadastro_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id)
);

CREATE INDEX idx_empresa_cadastro_checkout_id ON empresa_cadastro (asaas_checkout_id);
CREATE INDEX idx_empresa_cadastro_cnpj ON empresa_cadastro (cnpj);
CREATE INDEX idx_empresa_cadastro_admin_email ON empresa_cadastro (admin_email);
