CREATE TABLE ia_interacoes (
    id VARCHAR(36) NOT NULL,
    empresa_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL,
    pergunta TEXT NOT NULL,
    resposta TEXT NOT NULL,
    tokens_usados INT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT pk_ia_interacoes PRIMARY KEY (id),
    CONSTRAINT fk_ia_interacoes_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id),
    CONSTRAINT fk_ia_interacoes_usuario FOREIGN KEY (usuario_id) REFERENCES user_account (id)
);

CREATE TABLE ia_uso_mensal (
    id VARCHAR(36) NOT NULL,
    empresa_id BIGINT NOT NULL,
    mes DATE NOT NULL,
    total_perguntas INT NOT NULL,
    total_tokens INT NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT pk_ia_uso_mensal PRIMARY KEY (id),
    CONSTRAINT uk_ia_uso_mensal_empresa_mes UNIQUE (empresa_id, mes),
    CONSTRAINT fk_ia_uso_mensal_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id)
);

CREATE INDEX idx_ia_interacoes_empresa_id ON ia_interacoes (empresa_id);
CREATE INDEX idx_ia_interacoes_usuario_id ON ia_interacoes (usuario_id);
