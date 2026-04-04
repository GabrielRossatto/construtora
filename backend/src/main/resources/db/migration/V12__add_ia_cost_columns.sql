ALTER TABLE empresa
    ADD COLUMN ia_custo_total DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER icone_nome;

ALTER TABLE user_account
    ADD COLUMN ia_custo_total DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER ultimo_login;
