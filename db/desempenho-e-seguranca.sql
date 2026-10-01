-- nexo.social — segurança e desempenho do banco (2026-10-01)
-- O que o "Advisors" do Supabase aponta. Pode rodar mais de uma vez. Aplicar
-- depois de schema.sql e das outras migrações — e de novo sempre que rodar o
-- schema.sql outra vez (ele recria as políticas no formato antigo).
--
--   1. search_path fixo nas funções que ainda não tinham (ninguém troca o
--      schema por baixo delas).
--   2. Políticas de RLS: auth.uid() vira (SELECT auth.uid()). A regra é a
--      mesma; muda que o Postgres calcula o usuário uma vez por consulta, e
--      não uma vez por linha.
--   3. Índice para toda chave estrangeira que ainda não tem um: apagar ou
--      buscar pelo "pai" deixa de varrer a tabela inteira.

-- --- 1. search_path ---------------------------------------------------------------
ALTER FUNCTION public.is_platform_admin() SET search_path = public;
ALTER FUNCTION public.platform_admin_email() SET search_path = public;
ALTER FUNCTION public.slugify(TEXT) SET search_path = public;

-- --- 2. auth.* uma vez por consulta ------------------------------------------------
-- Reescreve só o que ainda chama auth.uid()/auth.jwt()/auth.role() direto; o que
-- já está como "( SELECT auth.uid() AS uid)" fica como está.
DO $$
DECLARE
  p RECORD;
  v_using TEXT;
  v_check TEXT;
  v_sql TEXT;
BEGIN
  FOR p IN SELECT tablename, policyname, qual, with_check FROM pg_policies WHERE schemaname = 'public' LOOP
    v_using := regexp_replace(p.qual, '(?<!SELECT )auth\.(uid|jwt|role)\(\)', '(SELECT auth.\1())', 'g');
    v_check := regexp_replace(p.with_check, '(?<!SELECT )auth\.(uid|jwt|role)\(\)', '(SELECT auth.\1())', 'g');
    IF v_using IS DISTINCT FROM p.qual OR v_check IS DISTINCT FROM p.with_check THEN
      v_sql := format('ALTER POLICY %I ON public.%I', p.policyname, p.tablename);
      IF v_using IS NOT NULL THEN
        v_sql := v_sql || format(' USING (%s)', v_using);
      END IF;
      IF v_check IS NOT NULL THEN
        v_sql := v_sql || format(' WITH CHECK (%s)', v_check);
      END IF;
      EXECUTE v_sql;
    END IF;
  END LOOP;
END $$;

-- --- 3. Índices das chaves estrangeiras ----------------------------------------------
-- Uma chave está coberta quando algum índice da tabela começa pelas mesmas colunas.
DO $$
DECLARE
  f RECORD;
BEGIN
  FOR f IN
    SELECT c.conrelid::regclass AS tabela,
           rel.relname AS nome_tabela,
           string_agg(quote_ident(a.attname), ', ' ORDER BY k.ord) AS colunas,
           string_agg(a.attname, '_' ORDER BY k.ord) AS nomes
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = rel.relnamespace AND n.nspname = 'public'
    CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord)
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
    WHERE c.contype = 'f'
      AND NOT EXISTS (
        SELECT 1 FROM pg_index i
        WHERE i.indrelid = c.conrelid
          AND (string_to_array(i.indkey::text, ' ')::int2[])[1:cardinality(c.conkey)] = c.conkey
      )
    GROUP BY c.oid, c.conrelid, rel.relname
  LOOP
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %s (%s)', left(f.nome_tabela || '_' || f.nomes || '_fk_idx', 63), f.tabela, f.colunas);
  END LOOP;
END $$;
