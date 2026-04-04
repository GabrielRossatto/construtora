ALTER TABLE ia_interacoes
    ADD COLUMN resposta_original TEXT NULL AFTER resposta,
    ADD COLUMN resposta_ajustada TINYINT(1) NOT NULL DEFAULT 0 AFTER resposta_original,
    ADD COLUMN nota_qualidade INT NOT NULL DEFAULT 0 AFTER resposta_ajustada;

CREATE INDEX idx_ia_interacoes_created_at ON ia_interacoes (created_at);
