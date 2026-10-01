// Regras da senha de cadastro — as mesmas do Supabase (Authentication →
// Policies): 8 a 128 caracteres, com letra minúscula, letra maiúscula, número
// e símbolo. Os símbolos são os que o Supabase reconhece; um acento não conta.
// Contas antigas seguem entrando com a senha que já têm: isto vale para criar
// a conta (e para quem trocar a senha).

export const SENHA_MINIMO = 8;
export const SENHA_MAXIMO = 128;

export const AVISO_DA_SENHA = 'Use 8 ou mais caracteres, com letra minúscula, letra maiúscula, número e símbolo.';

export const REGRAS_DA_SENHA: { id: string; texto: string; ok: (senha: string) => boolean }[] = [
  { id: 'tamanho', texto: '8 ou mais caracteres', ok: (s) => s.length >= SENHA_MINIMO },
  { id: 'minuscula', texto: 'letra minúscula', ok: (s) => /[a-z]/.test(s) },
  { id: 'maiuscula', texto: 'letra maiúscula', ok: (s) => /[A-Z]/.test(s) },
  { id: 'numero', texto: 'número', ok: (s) => /[0-9]/.test(s) },
  { id: 'simbolo', texto: 'símbolo (! @ # $ …)', ok: (s) => /[!@#$%^&*()_+\-=[\]{};'\\:"|<>?,./`~]/.test(s) },
];

export const senhaValida = (senha: string): boolean => senha.length <= SENHA_MAXIMO && REGRAS_DA_SENHA.every((r) => r.ok(senha));
