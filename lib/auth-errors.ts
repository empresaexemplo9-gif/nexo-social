// Tradução de erros de autenticação do Supabase para mensagens úteis.
//
// O supabase-js monta a mensagem com `msg ?? message ?? error_description ??
// error ?? JSON.stringify(body)`. Quando a API responde um corpo vazio, a
// mensagem vira literalmente "{}" — inútil para o usuário. Aqui detectamos esse
// caso e expomos status/código, além de traduzir os erros mais comuns.

/* eslint-disable @typescript-eslint/no-explicit-any */

const TRANSLATIONS: { match: RegExp; text: string }[] = [
  { match: /invalid login credentials/i, text: 'E-mail ou senha incorretos.' },
  { match: /email not confirmed/i, text: 'E-mail ainda não confirmado. Verifique sua caixa de entrada (e o spam).' },
  { match: /user already registered|already been registered/i, text: 'Este e-mail já possui conta. Use "Fazer login".' },
  { match: /password should be at least/i, text: 'A senha deve ter pelo menos 6 caracteres.' },
  { match: /signups not allowed|signup is disabled/i, text: 'Cadastro desabilitado no projeto. Ative em Supabase → Authentication → Providers → Email.' },
  { match: /database error saving new user/i, text: 'Erro no banco ao criar o usuário: o gatilho handle_new_user() falhou. Rode novamente o db/schema.sql atualizado no SQL Editor.' },
  { match: /email rate limit|over_email_send_rate_limit|rate limit/i, text: 'Limite de envio de e-mails atingido. Aguarde alguns minutos e tente de novo.' },
  { match: /forbidden use of secret api key/i, text: 'A chave secreta foi usada no navegador. Remova NEXT_PUBLIC_SUPABASE_ANON_KEY do Vercel e refaça o deploy.' },
  { match: /invalid api key|no api key/i, text: 'Chave de API inválida para este projeto. Confira a publishable key do projeto no Supabase.' },
  { match: /failed to fetch|networkerror|load failed/i, text: 'Não foi possível falar com o Supabase (rede/CORS). Confirme a URL do projeto.' },
];

/** Descreve um erro de auth de forma legível, sem esconder detalhes técnicos. */
export function describeAuthError(err: any): string {
  const raw = typeof err?.message === 'string' ? err.message.trim() : '';
  const status: number | undefined = err?.status ?? err?.originalError?.status;
  const code: string | undefined = err?.code ?? err?.error_code;

  // Corpo vazio ("{}" ou similar) — mensagem inútil vinda da API.
  const isEmpty = !raw || raw === '{}' || raw === '[object Object]' || raw === 'null';

  if (!isEmpty) {
    const hit = TRANSLATIONS.find((t) => t.match.test(raw));
    if (hit) return hit.text;
  }

  const parts: string[] = [];
  parts.push(isEmpty ? 'O Supabase retornou um erro sem detalhes.' : raw);
  const meta: string[] = [];
  if (status) meta.push(`status ${status}`);
  if (code) meta.push(`código ${code}`);
  if (meta.length) parts.push(`(${meta.join(', ')})`);

  if (isEmpty) {
    if (status === 401 || status === 403) {
      parts.push('— chave de API não aceita por este projeto.');
    } else if (status === 404) {
      parts.push('— endpoint não encontrado: a URL do projeto pode estar errada.');
    } else if (status && status >= 500) {
      parts.push('— falha no servidor: geralmente o gatilho handle_new_user() no banco. Rode o db/schema.sql atualizado.');
    } else {
      parts.push('— veja /api/health para diagnóstico da configuração.');
    }
  }

  return parts.join(' ');
}
