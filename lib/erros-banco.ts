// "O banco ainda não tem isso" (migração pendente). O Postgres responde 42P01
// (tabela) e 42703 (coluna); o PostgREST 12+ responde antes, pelo cache do
// esquema: PGRST205 para a tabela e PGRST204 para a coluna no corpo de uma
// gravação. Numa leitura com coluna que falta, segue vindo o 42703.

type ErroDoBanco = { code?: string | null } | null | undefined;

export const semTabela = (e: ErroDoBanco): boolean => e?.code === '42P01' || e?.code === 'PGRST205';

export const semColuna = (e: ErroDoBanco): boolean => e?.code === '42703' || e?.code === 'PGRST204';
