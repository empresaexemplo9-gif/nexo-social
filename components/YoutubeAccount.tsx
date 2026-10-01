'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Account {
  configurado: boolean;
  conectado: boolean;
  temporariamenteIndisponivel?: boolean;
  setup?: { credenciais: boolean; chaveSessao: boolean; retorno: string | null; dominioCorreto: boolean };
}
const results: Record<string, string> = {
  conectado: 'YouTube conectado. Suas curtidas e inscrições terão prioridade nas sugestões.',
  cancelado: 'Você cancelou a autorização do Google. Pode tentar novamente quando quiser.',
  indisponivel: 'A conexão com o Google ainda não está disponível. A administração precisa concluir a configuração.',
  configuracao: 'O Google não conseguiu validar a configuração do aplicativo. Informe a administração.',
  dominio: 'Abra o endereço oficial do Nexo Social para conectar sua conta do YouTube.',
  expirado: 'A autorização expirou. Toque em “Continuar com Google” para iniciar novamente.',
  sessao_expirada: 'Entre na plataforma e conecte o YouTube novamente para continuar.',
  permissao: 'A permissão para consultar sua conta do YouTube não foi concedida. Tente novamente e autorize esse acesso.',
  api_desativada: 'O acesso ao YouTube está desativado na configuração Google do aplicativo. Informe a administração.',
  falhou: 'Não foi possível concluir a conexão. Tente novamente; se o erro persistir, fale com a administração.',
};

export default function YoutubeAccount() {
  const pathname = usePathname();
  const isFeed = pathname === '/' || pathname === '/shorts';
  const [account, setAccount] = useState<Account | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [next, setNext] = useState('/conta#youtube');
  // A autorização abre em outra aba. Se a pessoa volta e a conta não conectou,
  // o Google parou no meio (app em teste, aviso de app não verificado…) e esta
  // aba não recebe nenhum retorno: dizemos o que aconteceu e o que fazer.
  const [tentativa, setTentativa] = useState<'nenhuma' | 'no-google' | 'voltou'>('nenhuma');

  useEffect(() => {
    const url = new URL(window.location.href);
    setNext(url.pathname === '/shorts' ? '/shorts' : url.pathname === '/' ? '/#trilha' : '/conta#youtube');
    const result = url.searchParams.get('youtube');
    if (result) {
      setMessage(results[result] || results.falhou);
      url.searchParams.delete('youtube');
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    let active = true;
    setError('');
    fetch('/api/youtube/conta', { cache: 'no-store', signal: controller.signal })
      .then(async r => {
        if (!r.ok) throw Error(r.status === 401 ? 'Sua sessão expirou. Entre novamente na plataforma.' : 'Não foi possível verificar a conexão do YouTube.');
        return r.json();
      })
      .then(data => { if (active) setAccount(data); })
      .catch(e => { if (active) setError(controller.signal.aborted ? 'A consulta demorou demais. Tente novamente.' : e.message); })
      .finally(() => window.clearTimeout(timeout));
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [attempt]);

  useEffect(() => {
    const update = (event: Event) => {
      const data = (event as CustomEvent<Account>).detail;
      if (data) { setAccount(data); setError(''); }
    };
    window.addEventListener('nexo:youtube-session', update);
    return () => window.removeEventListener('nexo:youtube-session', update);
  }, []);

  useEffect(() => {
    if (tentativa !== 'no-google') return;
    const voltou = () => {
      if (document.visibilityState !== 'visible') return;
      setTentativa('voltou');
      setAttempt(a => a + 1);
    };
    window.addEventListener('focus', voltou);
    document.addEventListener('visibilitychange', voltou);
    return () => { window.removeEventListener('focus', voltou); document.removeEventListener('visibilitychange', voltou); };
  }, [tentativa]);

  async function disconnect() {
    setBusy(true); setError('');
    try {
      const r = await fetch('/api/youtube/sair', { method: 'POST' });
      if (!r.ok) throw Error('Não foi possível desconectar. Tente novamente.');
      window.location.reload();
    } catch(e) { setError((e as Error).message); setBusy(false); }
  }
  // Keep account management on /conta; connected feeds should show only their content.
  if (isFeed && (account?.conectado || (!account && !error))) return null;

  return <div className="card-soft space-y-3 p-4 text-sm" aria-label="Conexão com o YouTube">
    <p className="font-semibold">{account?.conectado ? 'Sua conta do YouTube está conectada' : 'Conecte sua conta do YouTube'}</p>
    <p className="text-xs text-zinc-400">Use suas curtidas e inscrições para personalizar músicas e Shorts no Nexo Social. A autorização abre na tela segura do Google em outra aba. Depois de autorizar, volte para esta aba. Sua senha não é compartilhada com o aplicativo.</p>
    {!account && !error && <p role="status">Verificando conexão…</p>}
    {account?.conectado ? <button disabled={busy} type="button" onClick={() => void disconnect()} className="action-collage rounded-lg border px-3 py-2 disabled:opacity-50">{busy ? 'Desconectando…' : 'Desconectar YouTube'}</button>
      : account?.configurado ? <a target="_blank" rel="noopener noreferrer" href={`/api/youtube/entrar?next=${encodeURIComponent(next)}`} onClick={() => setTentativa('no-google')} className="action-collage inline-flex items-center gap-2 rounded-lg border px-4 py-3 font-semibold">Continuar com Google</a>
      : account && <p role="status" className="text-xs text-zinc-400">A conexão está aguardando configuração da administração. Você pode continuar usando as sugestões pelos interesses do seu perfil.</p>}
    {error && <div role="alert" className="space-y-2"><p>{error}</p><button type="button" onClick={() => setAttempt(a => a + 1)} className="underline">Tentar novamente</button> <Link href="/login?next=%2Fconta%23youtube" className="underline">Entrar na plataforma</Link></div>}
    {message && <p role="status">{message}</p>}
    {tentativa === 'voltou' && account?.configurado && !account.conectado && <div role="status" className="rounded-lg border border-clay-500/40 bg-clay-500/10 p-3 text-xs leading-relaxed">
      <p className="font-semibold">A conexão ainda não foi concluída.</p>
      <ul className="mt-1 list-disc space-y-1 pl-4">
        <li>Se o Google mostrou “Acesso bloqueado” ou “Erro 403: access_denied”, o aplicativo ainda está em fase de teste no Google e a sua conta precisa ser liberada pela administração da plataforma.</li>
        <li>Se apareceu “O Google não verificou este app”, toque em “Avançado” e depois em “Acessar” para continuar.</li>
        <li>Se a outra aba pediu para entrar na plataforma, entre por lá e toque de novo em “Continuar com Google”.</li>
      </ul>
    </div>}
    {account?.temporariamenteIndisponivel && <p role="status">Sua conexão está salva. O YouTube está temporariamente indisponível; tentaremos novamente automaticamente.</p>}
    {account?.setup && <details className="rounded-lg border border-zinc-700 p-3 text-xs">
      <summary className="cursor-pointer font-semibold">Configuração do administrador</summary>
      <ul className="mt-2 list-disc space-y-2 pl-4">
        <li>Credenciais OAuth Google: {account.setup.credenciais ? 'presentes' : 'ausentes no servidor. Configure YOUTUBE_OAUTH_CLIENT_ID e YOUTUBE_OAUTH_CLIENT_SECRET na Vercel.'}</li>
        <li>Proteção da sessão: {account.setup.chaveSessao ? 'configurada' : 'configure YOUTUBE_SESSION_SECRET no servidor.'}</li>
        <li className="break-all">Retorno OAuth: {account.setup.retorno || 'inválido; verifique YOUTUBE_OAUTH_REDIRECT_URI.'}</li>
        {!account.setup.dominioCorreto && <li>O domínio acessado deve ser o mesmo do retorno OAuth cadastrado.</li>}
        <li>Status de publicação no Google (Google Cloud → Google Auth Platform → Público-alvo): enquanto estiver “Em teste”, só os e-mails da lista de usuários de teste conseguem conectar; os outros veem “Acesso bloqueado”. Adicione o e-mail da pessoa nessa lista ou publique o app.</li>
      </ul>
    </details>}
    <p className="text-xs text-zinc-500">A seleção é feita pelo Nexo Social. A conexão não substitui o login do player do YouTube nem libera vídeos restritos.</p>
    <div className="flex flex-wrap gap-4 text-xs"><Link href="/privacidade" className="underline">Política de Privacidade</Link><Link href="/termos" className="underline">Termos de Serviço</Link></div>
  </div>;
}
