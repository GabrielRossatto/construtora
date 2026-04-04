ALTER TABLE institucional_arquivo
    ADD COLUMN pasta_destino VARCHAR(180) NULL,
    ADD COLUMN caminho_relativo VARCHAR(500) NULL;
