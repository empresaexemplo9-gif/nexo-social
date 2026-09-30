# Convites e chat: implantação no Supabase

Aplicado em 2026-09-29 (UTC) no projeto `srunjulrflvsbrkhllaf`, usado por
`https://nexo-social.drap.app.br`.

## Ordem de aplicação

Em um banco que já contém `db/schema.sql`, executar `db/platform-invites.sql`
e depois `db/community-chat.sql`, preferencialmente na mesma transação.
O primeiro arquivo usa `DO $$ ... END $$;` para adicionar a chave estrangeira.
Um delimitador `$` isolado não é SQL válido.

As migrações preservam o marco de contas existentes em
`2026-09-29 01:40:00+00`. Reexecutá-las não repõe créditos gastos nem libera
automaticamente contas criadas depois desse marco.

Se `db/schema.sql` for reaplicado posteriormente, reaplicar também
`db/community-chat.sql`: o schema base contém as funções legadas de entrada
por link, cujas permissões são revogadas pela migração de chat.

## Verificação realizada

- Ensaio das duas migrações com `BEGIN` e `ROLLBACK`, seguido da aplicação
  conjunta com `COMMIT` e recarga do schema do PostgREST.
- Quatro tabelas novas com RLS habilitado e seis políticas presentes.
- Contas anteriores ao marco com acesso e três créditos iniciais.
- Resgate de convites permitido somente ao `service_role`.
- Funções legadas `join_group_by_token` e `group_invite_preview` sem execução
  para `anon` e `authenticated`.
- Teste transacional de criação, desconto de crédito, resgate único, rejeição
  de aumento de crédito por membro e bloqueio da entrada por link legado.
- Teste transacional de escrita/leitura/exclusão pelo autor no chat de grupo,
  com leitura e escrita impedidas para um usuário de fora do grupo.
- Todos os dados dos testes transacionais revertidos ao término.
- Sessão real em produção: três convites disponíveis e saldos carregados no
  painel administrativo.
- `pnpm build`: 42 testes passaram e build concluído. O Next 14 emitiu um
  aviso local de reparo de dependências SWC no lockfile; o processo terminou
  com código zero. A configuração existente pula lint e checagem de tipos
  durante o build.

O teste no banco não substitui uma conversa real entre duas contas ou um novo
cadastro com confirmação de e-mail; esses fluxos não foram executados nesta
verificação.
