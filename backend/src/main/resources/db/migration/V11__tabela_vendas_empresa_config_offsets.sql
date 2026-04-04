ALTER TABLE tabela_vendas_empresa_config
    ADD COLUMN imagem_offset_x INT NOT NULL DEFAULT 0 AFTER divisao_inferior_percentual,
    ADD COLUMN imagem_offset_y INT NOT NULL DEFAULT 0 AFTER imagem_offset_x,
    ADD COLUMN icone_offset_x INT NOT NULL DEFAULT 0 AFTER imagem_offset_y,
    ADD COLUMN icone_offset_y INT NOT NULL DEFAULT 0 AFTER icone_offset_x,
    ADD COLUMN pagamento_offset_x INT NOT NULL DEFAULT 0 AFTER icone_offset_y,
    ADD COLUMN pagamento_offset_y INT NOT NULL DEFAULT 0 AFTER pagamento_offset_x;
