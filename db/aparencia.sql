-- nexo.social — aparência da home e dos botões (2026-09-30)
-- Cada pessoa escolhe a cor e a textura do fundo da home e a cor dos botões e
-- destaques, entre os temas dos convites. Guarda {fundo, botoes} (ids dos
-- temas, validados pela API). Sem esta coluna a escolha fica só no aparelho.
-- Pode rodar mais de uma vez.
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS appearance JSONB;
