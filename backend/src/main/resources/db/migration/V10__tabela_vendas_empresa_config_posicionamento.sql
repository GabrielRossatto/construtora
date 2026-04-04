ALTER TABLE tabela_vendas_empresa_config
    ADD COLUMN largura_coluna_lateral_px INT NOT NULL DEFAULT 450 AFTER pagamento_em_destaque,
    ADD COLUMN altura_imagem_percentual INT NOT NULL DEFAULT 70 AFTER largura_coluna_lateral_px,
    ADD COLUMN divisao_inferior_percentual INT NOT NULL DEFAULT 50 AFTER altura_imagem_percentual;
