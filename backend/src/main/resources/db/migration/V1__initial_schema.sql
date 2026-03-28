CREATE TABLE empresa (
    id BIGINT NOT NULL AUTO_INCREMENT,
    nome VARCHAR(140) NOT NULL,
    cnpj VARCHAR(18) NOT NULL,
    plano VARCHAR(20) NOT NULL,
    icone_url VARCHAR(500) NULL,
    icone_nome VARCHAR(255) NULL,
    data_criacao DATETIME(6) NOT NULL,
    CONSTRAINT pk_empresa PRIMARY KEY (id),
    CONSTRAINT uk_empresa_cnpj UNIQUE (cnpj)
);

CREATE TABLE permission (
    id BIGINT NOT NULL AUTO_INCREMENT,
    code VARCHAR(60) NOT NULL,
    description VARCHAR(200) NOT NULL,
    CONSTRAINT pk_permission PRIMARY KEY (id),
    CONSTRAINT uk_permission_code UNIQUE (code)
);

CREATE TABLE role (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(30) NOT NULL,
    description VARCHAR(200) NOT NULL,
    CONSTRAINT pk_role PRIMARY KEY (id),
    CONSTRAINT uk_role_name UNIQUE (name)
);

CREATE TABLE role_permission (
    role_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    CONSTRAINT pk_role_permission PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permission_role FOREIGN KEY (role_id) REFERENCES role (id),
    CONSTRAINT fk_role_permission_permission FOREIGN KEY (permission_id) REFERENCES permission (id)
);

CREATE TABLE user_account (
    id BIGINT NOT NULL AUTO_INCREMENT,
    empresa_id BIGINT NOT NULL,
    nome VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL,
    telefone VARCHAR(30) NULL,
    senha_hash VARCHAR(255) NOT NULL,
    role_id BIGINT NOT NULL,
    ativo BIT(1) NOT NULL,
    data_criacao DATETIME(6) NOT NULL,
    ultimo_login DATETIME(6) NULL,
    CONSTRAINT pk_user_account PRIMARY KEY (id),
    CONSTRAINT uk_user_account_email UNIQUE (email),
    CONSTRAINT fk_user_account_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id),
    CONSTRAINT fk_user_account_role FOREIGN KEY (role_id) REFERENCES role (id)
);

CREATE TABLE user_permission (
    user_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    CONSTRAINT pk_user_permission PRIMARY KEY (user_id, permission_id),
    CONSTRAINT fk_user_permission_user FOREIGN KEY (user_id) REFERENCES user_account (id),
    CONSTRAINT fk_user_permission_permission FOREIGN KEY (permission_id) REFERENCES permission (id)
);

CREATE TABLE empreendimento (
    id BIGINT NOT NULL AUTO_INCREMENT,
    empresa_id BIGINT NOT NULL,
    foto_perfil_url VARCHAR(500) NULL,
    public_token VARCHAR(40) NULL,
    nome VARCHAR(160) NOT NULL,
    descricao TEXT NOT NULL,
    metragem_lazer DECIMAL(10,2) NOT NULL,
    descricao_lazer TEXT NOT NULL,
    percentual_obra INT NOT NULL,
    data_inicio_obra DATE NULL,
    data_entrega DATE NULL,
    data_referencia_tabela_vendas DATE NULL,
    entrada_tipo VARCHAR(20) NULL,
    entrada_valor DECIMAL(12,2) NULL,
    saldo_pagamento TEXT NULL,
    reforcos_pagamento TEXT NULL,
    data_criacao DATETIME(6) NOT NULL,
    CONSTRAINT pk_empreendimento PRIMARY KEY (id),
    CONSTRAINT uk_empreendimento_public_token UNIQUE (public_token),
    CONSTRAINT fk_empreendimento_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id)
);

CREATE TABLE empreendimento_localizacao (
    id BIGINT NOT NULL AUTO_INCREMENT,
    empreendimento_id BIGINT NOT NULL,
    cep VARCHAR(10) NOT NULL,
    logradouro VARCHAR(160) NOT NULL,
    numero VARCHAR(20) NOT NULL,
    complemento VARCHAR(120) NULL,
    bairro VARCHAR(120) NOT NULL,
    cidade VARCHAR(120) NOT NULL,
    estado VARCHAR(2) NOT NULL,
    CONSTRAINT pk_empreendimento_localizacao PRIMARY KEY (id),
    CONSTRAINT uk_empreendimento_localizacao_empreendimento UNIQUE (empreendimento_id),
    CONSTRAINT fk_empreendimento_localizacao_empreendimento FOREIGN KEY (empreendimento_id) REFERENCES empreendimento (id) ON DELETE CASCADE
);

CREATE TABLE empreendimento_tipo (
    id BIGINT NOT NULL AUTO_INCREMENT,
    empreendimento_id BIGINT NOT NULL,
    titulo VARCHAR(40) NOT NULL,
    area_metragem DECIMAL(10,2) NOT NULL,
    planta_imagem_url VARCHAR(500) NULL,
    quantidade_suites INT NOT NULL,
    quantidade_vagas INT NOT NULL,
    CONSTRAINT pk_empreendimento_tipo PRIMARY KEY (id),
    CONSTRAINT uk_empreendimento_tipo_titulo UNIQUE (empreendimento_id, titulo),
    CONSTRAINT fk_empreendimento_tipo_empreendimento FOREIGN KEY (empreendimento_id) REFERENCES empreendimento (id) ON DELETE CASCADE
);

CREATE TABLE empreendimento_tipo_unidade (
    id BIGINT NOT NULL AUTO_INCREMENT,
    tipo_id BIGINT NOT NULL,
    codigo_unidade VARCHAR(40) NOT NULL,
    tipo_valor VARCHAR(20) NOT NULL,
    valor DECIMAL(12,2) NULL,
    CONSTRAINT pk_empreendimento_tipo_unidade PRIMARY KEY (id),
    CONSTRAINT uk_tipo_unidade_codigo UNIQUE (tipo_id, codigo_unidade),
    CONSTRAINT fk_empreendimento_tipo_unidade_tipo FOREIGN KEY (tipo_id) REFERENCES empreendimento_tipo (id) ON DELETE CASCADE
);

CREATE TABLE empreendimento_arquivo (
    id BIGINT NOT NULL AUTO_INCREMENT,
    empresa_id BIGINT NOT NULL,
    empreendimento_id BIGINT NOT NULL,
    url VARCHAR(500) NOT NULL,
    tipo VARCHAR(60) NOT NULL,
    tamanho_bytes BIGINT NOT NULL,
    data_upload DATETIME(6) NOT NULL,
    CONSTRAINT pk_empreendimento_arquivo PRIMARY KEY (id),
    CONSTRAINT fk_empreendimento_arquivo_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id),
    CONSTRAINT fk_empreendimento_arquivo_empreendimento FOREIGN KEY (empreendimento_id) REFERENCES empreendimento (id) ON DELETE CASCADE
);

CREATE TABLE material (
    id BIGINT NOT NULL AUTO_INCREMENT,
    empresa_id BIGINT NOT NULL,
    empreendimento_id BIGINT NULL,
    titulo VARCHAR(160) NOT NULL,
    tipo_arquivo VARCHAR(20) NOT NULL,
    arquivo_url VARCHAR(500) NOT NULL,
    pasta_destino VARCHAR(180) NULL,
    caminho_relativo VARCHAR(500) NULL,
    descricao TEXT NULL,
    tamanho_bytes BIGINT NOT NULL,
    data_upload DATETIME(6) NOT NULL,
    CONSTRAINT pk_material PRIMARY KEY (id),
    CONSTRAINT fk_material_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id),
    CONSTRAINT fk_material_empreendimento FOREIGN KEY (empreendimento_id) REFERENCES empreendimento (id) ON DELETE SET NULL
);

CREATE TABLE institucional_arquivo (
    id BIGINT NOT NULL AUTO_INCREMENT,
    empresa_id BIGINT NOT NULL,
    titulo VARCHAR(180) NOT NULL,
    arquivo_url VARCHAR(500) NULL,
    arquivo_nome VARCHAR(255) NULL,
    link_url VARCHAR(1000) NULL,
    data_criacao DATETIME(6) NOT NULL,
    CONSTRAINT pk_institucional_arquivo PRIMARY KEY (id),
    CONSTRAINT fk_institucional_arquivo_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id)
);

CREATE TABLE audit_log (
    id BIGINT NOT NULL AUTO_INCREMENT,
    usuario_id BIGINT NOT NULL,
    empresa_id BIGINT NOT NULL,
    acao VARCHAR(80) NOT NULL,
    entidade VARCHAR(80) NOT NULL,
    entidade_id BIGINT NOT NULL,
    timestamp DATETIME(6) NOT NULL,
    ip VARCHAR(45) NOT NULL,
    CONSTRAINT pk_audit_log PRIMARY KEY (id),
    CONSTRAINT fk_audit_log_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id)
);

CREATE INDEX idx_user_account_empresa_id ON user_account (empresa_id);
CREATE INDEX idx_empreendimento_empresa_id ON empreendimento (empresa_id);
CREATE INDEX idx_material_empresa_id ON material (empresa_id);
CREATE INDEX idx_material_empreendimento_id ON material (empreendimento_id);
CREATE INDEX idx_institucional_arquivo_empresa_id ON institucional_arquivo (empresa_id);
CREATE INDEX idx_empreendimento_arquivo_empresa_id ON empreendimento_arquivo (empresa_id);
CREATE INDEX idx_audit_log_empresa_id ON audit_log (empresa_id);
