-- =============================================================================
-- Apaga de vez as tabelas da bilheteria própria, que a plataforma não usa mais.
--
-- NÃO FAZ PARTE do db/schema.sql de propósito: apagar pedido pago não tem
-- volta, e o schema.sql pode ser rodado de novo a qualquer hora. Antes de rodar
-- este arquivo, exporte o que precisar guardar (Table Editor → ticket_orders →
-- Export to CSV) — pedidos pagos, por exemplo, interessam à contabilidade.
--
-- Pode rodar antes ou depois do schema.sql atual e quantas vezes quiser.
-- =============================================================================

-- As funções primeiro: elas leem estas tabelas, e o PostgreSQL não registra
-- essa dependência — sobrariam publicadas no /rest/v1/rpc, quebradas.
DROP FUNCTION IF EXISTS criar_pedido_ingresso(UUID, JSONB, TEXT, TEXT);
DROP FUNCTION IF EXISTS cancelar_meu_pedido(UUID);
DROP FUNCTION IF EXISTS confirmar_pedido_ingresso(UUID, TEXT);
DROP FUNCTION IF EXISTS cancelar_pedido_ingresso(UUID, TEXT);
DROP FUNCTION IF EXISTS expirar_pedidos_vencidos();
DROP FUNCTION IF EXISTS emitir_ingressos(UUID);
DROP FUNCTION IF EXISTS validar_ingresso(TEXT);

-- Das que referenciam para as referenciadas. As policies vão junto.
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS ticket_order_items;
DROP TABLE IF EXISTS ticket_orders;
DROP TABLE IF EXISTS ticket_types;

-- Só as policies acima usavam esta função.
DROP FUNCTION IF EXISTS owns_event(UUID);
