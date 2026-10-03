-- nexo.social — missões que liberam colecionáveis por sorteio, e trocas de repetidos
--
-- As missões ficam no código (lib/missoes.ts): o servidor confere o progresso
-- no uso real da plataforma (publicações, comentários, rodas, grupos…) e, na
-- hora do resgate, chama exclusivos_resgatar_missao — que registra o resgate
-- (uma vez por missão e período) e sorteia itens quaisquer do catálogo. Item
-- sorteado de novo vira repetido (quantidade + 1), e repetido se troca com
-- outra pessoa: só repetido por repetido, para ninguém perder o último.
-- As funções só rodam com a chave de serviço (as rotas da API conferem quem é).
-- Pode rodar mais de uma vez. Depende de db/exclusivos.sql.

-- --- Quantidade de cada item na coleção da pessoa e o que entra no sorteio -----
ALTER TABLE exclusive_asset_grants ADD COLUMN IF NOT EXISTS quantidade INTEGER NOT NULL DEFAULT 1;
ALTER TABLE exclusive_asset_grants DROP CONSTRAINT IF EXISTS exclusive_asset_grants_quantidade_check;
ALTER TABLE exclusive_asset_grants ADD CONSTRAINT exclusive_asset_grants_quantidade_check CHECK (quantidade BETWEEN 1 AND 999);

-- O superadministrador pode deixar um item só para os kits (fora do sorteio).
ALTER TABLE exclusive_assets ADD COLUMN IF NOT EXISTS sorteavel BOOLEAN NOT NULL DEFAULT TRUE;

-- --- Missões resgatadas ---------------------------------------------------------
-- `periodo`: 'sempre' para as conquistas; a semana ('2026-S40') para as semanais.
CREATE TABLE IF NOT EXISTS missao_resgates (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  missao TEXT NOT NULL CHECK (missao ~ '^[a-z0-9-]{1,60}$'),
  periodo TEXT NOT NULL CHECK (periodo ~ '^(sempre|[0-9]{4}-S[0-9]{2})$'),
  itens UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, missao, periodo)
);

ALTER TABLE missao_resgates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS missao_resgates_select ON missao_resgates;
CREATE POLICY missao_resgates_select ON missao_resgates
FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) OR is_platform_admin());

-- --- Trocas ---------------------------------------------------------------------
-- `de_id` oferece `oferece` (um repetido seu) e pede `pede` (um repetido de `para_id`).
CREATE TABLE IF NOT EXISTS exclusivos_trocas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  de_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  para_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  oferece UUID NOT NULL REFERENCES exclusive_assets(id) ON DELETE CASCADE,
  pede UUID NOT NULL REFERENCES exclusive_assets(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'aceita', 'recusada', 'cancelada', 'indisponivel')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  respondida_em TIMESTAMPTZ,
  CHECK (de_id <> para_id),
  CHECK (oferece <> pede)
);

CREATE UNIQUE INDEX IF NOT EXISTS exclusivos_trocas_uma_aberta
  ON exclusivos_trocas(de_id, para_id, oferece, pede) WHERE status = 'aberta';
CREATE INDEX IF NOT EXISTS exclusivos_trocas_para_idx ON exclusivos_trocas(para_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS exclusivos_trocas_de_idx ON exclusivos_trocas(de_id, status, created_at DESC);

ALTER TABLE exclusivos_trocas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS exclusivos_trocas_select ON exclusivos_trocas;
CREATE POLICY exclusivos_trocas_select ON exclusivos_trocas
FOR SELECT TO authenticated
USING (de_id = (SELECT auth.uid()) OR para_id = (SELECT auth.uid()) OR is_platform_admin());

-- --- Funções (só a chave de serviço) -----------------------------------------------

/** Dá um item à pessoa: entra na coleção ou soma mais um repetido. */
CREATE OR REPLACE FUNCTION exclusivos_dar_item(p_user UUID, p_asset UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO exclusive_asset_grants (asset_id, user_id, quantidade)
  VALUES (p_asset, p_user, 1)
  ON CONFLICT (asset_id, user_id) DO UPDATE SET quantidade = LEAST(999, exclusive_asset_grants.quantidade + 1);
$$;

/**
 * Resgata uma missão: registra (uma vez por missão e período — a 2ª vez dá
 * unique_violation) e sorteia `p_quantos` itens quaisquer do catálogo ativo e
 * sorteável. Pode sair repetido. Devolve os itens sorteados, na ordem.
 */
CREATE OR REPLACE FUNCTION exclusivos_resgatar_missao(p_user UUID, p_missao TEXT, p_periodo TEXT, p_quantos INTEGER)
RETURNS UUID[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_itens UUID[] := '{}';
  v_id UUID;
BEGIN
  IF p_quantos IS NULL OR p_quantos < 1 OR p_quantos > 5 THEN
    RAISE EXCEPTION 'quantidade de itens inválida' USING ERRCODE = '22023';
  END IF;
  INSERT INTO missao_resgates (user_id, missao, periodo) VALUES (p_user, p_missao, p_periodo);
  FOR i IN 1..p_quantos LOOP
    SELECT id INTO v_id FROM exclusive_assets WHERE active AND sorteavel ORDER BY random() LIMIT 1;
    EXIT WHEN v_id IS NULL;
    PERFORM exclusivos_dar_item(p_user, v_id);
    v_itens := v_itens || v_id;
  END LOOP;
  IF cardinality(v_itens) = 0 THEN
    RAISE EXCEPTION 'não há itens no sorteio' USING ERRCODE = 'P0002';
  END IF;
  UPDATE missao_resgates SET itens = v_itens WHERE user_id = p_user AND missao = p_missao AND periodo = p_periodo;
  RETURN v_itens;
END;
$$;

/** Quantos do item a pessoa tem (0 se nenhum). */
CREATE OR REPLACE FUNCTION exclusivos_quantos(p_user UUID, p_asset UUID)
RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT quantidade FROM exclusive_asset_grants WHERE user_id = p_user AND asset_id = p_asset), 0);
$$;

/** Propõe uma troca: só repetido por repetido. Devolve o id da proposta. */
CREATE OR REPLACE FUNCTION exclusivos_propor_troca(p_de UUID, p_para UUID, p_oferece UUID, p_pede UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  IF p_de = p_para OR p_oferece = p_pede THEN
    RAISE EXCEPTION 'troca inválida' USING ERRCODE = '22023';
  END IF;
  IF exclusivos_quantos(p_de, p_oferece) < 2 THEN
    RAISE EXCEPTION 'você só pode oferecer um item repetido' USING ERRCODE = 'P0001';
  END IF;
  IF exclusivos_quantos(p_para, p_pede) < 2 THEN
    RAISE EXCEPTION 'esse item não está mais repetido com a outra pessoa' USING ERRCODE = 'P0001';
  END IF;
  IF (SELECT count(*) FROM exclusivos_trocas WHERE de_id = p_de AND status = 'aberta') >= 20 THEN
    RAISE EXCEPTION 'você já tem 20 propostas abertas' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO exclusivos_trocas (de_id, para_id, oferece, pede) VALUES (p_de, p_para, p_oferece, p_pede)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

/**
 * Responde a uma proposta (só quem a recebeu). Aceitar troca os itens na hora,
 * se os dois ainda tiverem o repetido; senão a proposta fica 'indisponivel'.
 * Devolve o status final.
 */
CREATE OR REPLACE FUNCTION exclusivos_responder_troca(p_user UUID, p_troca UUID, p_aceitar BOOLEAN)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t exclusivos_trocas%ROWTYPE;
  v_dele INTEGER;
  v_minha INTEGER;
BEGIN
  SELECT * INTO t FROM exclusivos_trocas WHERE id = p_troca FOR UPDATE;
  IF NOT FOUND OR t.para_id <> p_user THEN
    RAISE EXCEPTION 'proposta não encontrada' USING ERRCODE = 'P0002';
  END IF;
  IF t.status <> 'aberta' THEN
    RETURN t.status;
  END IF;
  IF NOT p_aceitar THEN
    UPDATE exclusivos_trocas SET status = 'recusada', respondida_em = now() WHERE id = p_troca;
    RETURN 'recusada';
  END IF;
  -- Trava as duas linhas na mesma ordem (por asset_id, user_id) para não cruzar com outra troca.
  PERFORM 1 FROM exclusive_asset_grants
   WHERE (asset_id = t.oferece AND user_id = t.de_id) OR (asset_id = t.pede AND user_id = t.para_id)
   ORDER BY asset_id, user_id FOR UPDATE;
  v_dele := exclusivos_quantos(t.de_id, t.oferece);
  v_minha := exclusivos_quantos(t.para_id, t.pede);
  IF v_dele < 2 OR v_minha < 2 THEN
    UPDATE exclusivos_trocas SET status = 'indisponivel', respondida_em = now() WHERE id = p_troca;
    RETURN 'indisponivel';
  END IF;
  UPDATE exclusive_asset_grants SET quantidade = quantidade - 1 WHERE asset_id = t.oferece AND user_id = t.de_id;
  UPDATE exclusive_asset_grants SET quantidade = quantidade - 1 WHERE asset_id = t.pede AND user_id = t.para_id;
  PERFORM exclusivos_dar_item(t.para_id, t.oferece);
  PERFORM exclusivos_dar_item(t.de_id, t.pede);
  UPDATE exclusivos_trocas SET status = 'aceita', respondida_em = now() WHERE id = p_troca;
  RETURN 'aceita';
END;
$$;

/** Cancela uma proposta (só quem fez, enquanto aberta). */
CREATE OR REPLACE FUNCTION exclusivos_cancelar_troca(p_user UUID, p_troca UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status TEXT;
BEGIN
  UPDATE exclusivos_trocas SET status = 'cancelada', respondida_em = now()
   WHERE id = p_troca AND de_id = p_user AND status = 'aberta'
  RETURNING status INTO v_status;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'proposta não encontrada' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_status;
END;
$$;

REVOKE ALL ON FUNCTION exclusivos_dar_item(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION exclusivos_resgatar_missao(UUID, TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION exclusivos_quantos(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION exclusivos_propor_troca(UUID, UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION exclusivos_responder_troca(UUID, UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION exclusivos_cancelar_troca(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION exclusivos_dar_item(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION exclusivos_resgatar_missao(UUID, TEXT, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION exclusivos_quantos(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION exclusivos_propor_troca(UUID, UUID, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION exclusivos_responder_troca(UUID, UUID, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION exclusivos_cancelar_troca(UUID, UUID) TO service_role;
