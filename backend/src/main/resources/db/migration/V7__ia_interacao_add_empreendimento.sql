ALTER TABLE ia_interacoes
    ADD COLUMN empreendimento_id BIGINT NULL AFTER usuario_id;

CREATE INDEX idx_ia_interacoes_empresa_usuario_empreendimento_created
    ON ia_interacoes (empresa_id, usuario_id, empreendimento_id, created_at);
