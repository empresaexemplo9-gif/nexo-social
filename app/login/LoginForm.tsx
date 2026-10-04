'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Selo } from '@/components/Logo';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { ADMIN_EMAIL, isPlatformAdmin, type AccountType } from '@/lib/auth';
import { describeAuthError } from '@/lib/auth-errors';
import { ensureProfile } from '@/lib/provisioning';
import { safeAuthDestination } from '@/lib/auth-redirect';
import { getSupabaseEnv } from '@/lib/supabase-config';
import { AVISO_DA_SENHA, REGRAS_DA_SENHA, SENHA_MINIMO, senhaValida } from '@/lib/senha';
import { REGRAS, REGRAS_RESUMO, REGRAS_TITULO } from '@/lib/regras';

function destinoSeguro(raw: string | null): string | null {
  return safeAuthDestination(raw);
}

export default function LoginPage() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [inviteToken, setInviteToken] = useState('');
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  const [inviteError, setInviteError] = useState('');
  const [next, setNext] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<AccountType>('pessoal');
  const [fullName, setFullName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  // Criar conta exige ler e aceitar as regras da comunidade (e-mail ou Google).
  const [aceitouRegras, setAceitouRegras] = useState(false);
  const bloqueadoPelasRegras = isRegistering && !aceitouRegras;

  const validarConvite = useCallback(async (token: string, signal?: AbortSignal) => {
    setInviteValid(null);
    setInviteError('');
    try {
      const response = await fetch(`/api/invites/validate?token=${encodeURIComponent(token)}`, { cache: 'no-store', signal });
      const result = await response.json();
      if (!response.ok || typeof result.valid !== 'boolean') throw new Error('Validação indisponível');
      if (!signal?.aborted) setInviteValid(result.valid);
    } catch {
      if (!signal?.aborted) setInviteError('Não foi possível validar seu convite agora. Tente novamente.');
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNext(destinoSeguro(params.get('next')));
    const token = params.get('convite')?.trim().toLowerCase() || '';
    setInviteToken(token);

    const errors: Record<string, string> = {
      oauth_cancelled: 'A entrada foi cancelada ou recusada. Tente novamente.',
      invalid_callback: 'Este link expirou ou foi aberto em outro navegador. Inicie o acesso novamente.',
      auth_unavailable: 'Não foi possível concluir o acesso. Tente novamente.',
      profile_unavailable: 'Sua sessão foi validada, mas não foi possível preparar seu perfil.',
      invite_required: 'A criação de novas contas é exclusiva por convite.',
      invite_invalid: 'Este convite é inválido ou já foi utilizado.',
      invite_unavailable: 'O sistema de convites está temporariamente indisponível.',
    };
    if (params.get('error')) setMessage(errors[params.get('error')!] ?? 'Não foi possível concluir o acesso.');

    const controller = new AbortController();
    if (token) {
      setIsRegistering(true);
      void validarConvite(token, controller.signal);
    } else {
      setInviteValid(false);
    }
    return () => controller.abort();
  }, [validarConvite]);

  const handleGoogle = async () => {
    if (!supabase) { setMessage('Login temporariamente indisponível.'); return; }
    if (isRegistering && inviteValid !== true) { setMessage('Este convite não pode ser usado.'); return; }
    if (bloqueadoPelasRegras) { setMessage('Para criar a conta, leia e aceite as regras da comunidade.'); return; }
    setLoading(true);
    setMessage('');
    try {
      const config = getSupabaseEnv();
      const settingsResponse = await fetch(`${config.url}/auth/v1/settings`, {
        headers: { apikey: config.anonKey }, cache: 'no-store', signal: AbortSignal.timeout(10000),
      });
      if (!settingsResponse.ok) throw new Error('Não foi possível consultar o serviço de login. Tente novamente.');
      const settings = await settingsResponse.json();
      if (!settings.external?.google) throw new Error('A entrada com Google ainda está sendo configurada. Use e-mail e senha.');

      const callback = new URL('/auth/callback', window.location.origin);
      if (next) callback.searchParams.set('next', next);
      if (isRegistering && inviteToken) {
        callback.searchParams.set('convite', inviteToken);
        callback.searchParams.set('regras', '1');
      }
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google', options: { redirectTo: callback.toString(), queryParams: { prompt: 'select_account' } },
      });
      if (error) throw error;
      if (!data.url) throw new Error('Não foi possível iniciar o login com Google.');
    } catch (err) {
      setMessage(describeAuthError(err));
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    if (!isSupabaseConfigured || !supabase) {
      setMessage('O login está temporariamente indisponível. Tente novamente mais tarde.');
      return;
    }
    setLoading(true);
    try {
      const tenantName = accountType === 'organizacao' ? organizationName : fullName;
      if (isRegistering) {
        if (inviteValid !== true) throw new Error('Você precisa de um convite válido para criar a conta.');
        if (!aceitouRegras) throw new Error('Para criar a conta, leia e aceite as regras da comunidade.');
        if (!senhaValida(password)) throw new Error(AVISO_DA_SENHA);
        const res = await fetch('/api/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim().toLowerCase(), password, fullName, accountType, tenantName, next, inviteToken, aceitouRegras,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Falha ao criar a conta.');
        if (json.confirmacaoPendente) {
          setMessage('✓ Conta criada! Confirme o e-mail que enviamos e depois faça login.');
          setIsRegistering(false);
          return;
        }
        setMessage('✓ Conta criada! Entrando…');
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (signInError) throw signInError;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (error) throw error;
        setMessage('✓ Autenticação realizada! Preparando sua conta…');
      }

      const { data: { user }, error: sessionError } = await supabase.auth.getUser();
      if (sessionError || !user) throw new Error('Não foi possível validar sua sessão.');
      const metadata = user.user_metadata ?? {};
      const prov = await ensureProfile(
        metadata.full_name || fullName,
        metadata.tenant_name || tenantName,
        metadata.account_type === 'organizacao' ? 'organizacao' : accountType,
      );
      if (!prov.ok) throw new Error('Sua sessão foi validada, mas não foi possível preparar seu perfil.');
      window.location.href = next ?? (isPlatformAdmin(user.email) ? '/admin' : '/');
    } catch (err: any) {
      console.error('[auth] falha:', err);
      setMessage(`❌ ${describeAuthError(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tela-sem-barra flex min-h-screen items-center justify-center p-4 text-zinc-100">
      <div className="card-soft cantos-hud w-full max-w-md space-y-6 p-8">
        <div className="text-center">
          <Link href="/" className="inline-flex flex-col items-center gap-2">
            <Selo size={112} girar textura />
            <span className="font-display text-2xl font-bold text-zinc-50">nexo<span className="text-clay-500">.</span>social</span>
          </Link>
          <h2 className="mt-4 text-lg font-semibold text-zinc-50">{isRegistering ? 'Criar conta por convite' : 'Entrar na plataforma'}</h2>
          <p className="mt-1 text-xs text-zinc-400">
            {isRegistering
              ? inviteError ? inviteError : inviteValid === null ? 'Validando seu convite…' : inviteValid ? 'Convite válido. Complete seu cadastro.' : 'Este convite não é válido ou já foi utilizado.'
              : 'Novas contas são criadas somente por convite.'}
          </p>
        </div>

        {isRegistering && inviteError && <button type="button" onClick={() => void validarConvite(inviteToken)}
          className="w-full rounded-xl border border-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-300">
          Tentar validar convite novamente
        </button>}

        {message && <div role="status" aria-live="polite" className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-center text-xs">{message}</div>}

        {isRegistering && (
          <section aria-labelledby="regras-titulo" className="space-y-2 rounded-xl border border-clay-500/50 bg-clay-500/10 p-4 text-xs leading-relaxed text-zinc-200">
            <h3 id="regras-titulo" className="text-sm font-semibold text-zinc-50">{REGRAS_TITULO}</h3>
            <p>{REGRAS_RESUMO}</p>
            <ul className="list-disc space-y-1 pl-4">
              {REGRAS.map((r) => <li key={r}>{r}</li>)}
            </ul>
            <label className="flex cursor-pointer items-start gap-2 pt-1 font-semibold text-zinc-50">
              <input type="checkbox" checked={aceitouRegras} onChange={(e) => setAceitouRegras(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500" />
              <span>Li e aceito as regras. Sei que palavras grotescas levam ao banimento permanente da conta.</span>
            </label>
          </section>
        )}

        <button type="button" onClick={handleGoogle} disabled={loading || (isRegistering && inviteValid !== true) || bloqueadoPelasRegras}
          className="w-full rounded-xl border border-zinc-600 bg-white px-4 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-60">
          {loading ? 'Aguarde…' : isRegistering ? 'Criar conta com Google' : 'Entrar com Google'}
        </button>

        <div className="text-center text-xs text-zinc-500">ou continue com e-mail e senha</div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isRegistering && (
            <>
              <div className="grid grid-cols-2 gap-2">
                {(['pessoal', 'organizacao'] as AccountType[]).map((type) => (
                  <button key={type} type="button" onClick={() => setAccountType(type)}
                    className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${accountType === type ? 'border-emerald-600 bg-emerald-950/40 text-emerald-400' : 'border-zinc-800 bg-zinc-950 text-zinc-400'}`}>
                    {type === 'pessoal' ? '👤 Conta Pessoal' : '🏢 Organização'}
                  </button>
                ))}
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Seu nome</label>
                <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nome completo"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none" />
              </div>
              {accountType === 'organizacao' && (
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Nome da organização</label>
                  <input type="text" required value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="Ex: Minha Empresa"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none" />
                </div>
              )}
            </>
          )}
          <div>
            <label className="mb-1 block text-xs text-zinc-400">E-mail</label>
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Senha</label>
            <input type="password" autoComplete={isRegistering ? 'new-password' : 'current-password'} required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" minLength={isRegistering ? SENHA_MINIMO : undefined} aria-describedby={isRegistering ? 'regras-da-senha' : undefined}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none" />
            {/* Só no cadastro: quem já tem conta entra com a senha que já usa. */}
            {isRegistering && (
              <ul id="regras-da-senha" aria-label="A senha precisa ter" className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                {REGRAS_DA_SENHA.map((r) => {
                  const ok = r.ok(password);
                  return (
                    <li key={r.id} className={ok ? 'text-emerald-400' : 'text-zinc-500'}>
                      <span aria-hidden>{ok ? '✓' : '○'}</span> {r.texto}
                      <span className="sr-only">{ok ? ' (ok)' : ' (falta)'}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <button type="submit" disabled={loading || (isRegistering && inviteValid !== true) || bloqueadoPelasRegras}
            className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-60">
            {loading ? 'Processando…' : isRegistering ? 'Criar conta' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-400">
          Consulte os <Link href="/termos" className="underline">Termos de Serviço</Link> e a <Link href="/privacidade" className="underline">Política de Privacidade</Link>.
        </p>

        {isRegistering ? (
          <div className="text-center">
            <button onClick={() => { setIsRegistering(false); setMessage(''); }} className="text-xs text-zinc-400 underline hover:text-emerald-400">
              Já possui conta? Fazer login
            </button>
          </div>
        ) : (
          <p className="text-center text-xs text-zinc-500">Não possui conta? Peça um convite a alguém que já participa da nexo.social.</p>
        )}

        <p className="border-t border-zinc-800 pt-4 text-center text-[11px] leading-relaxed text-zinc-500">
          O painel administrativo global é exclusivo da conta <span className="font-mono text-zinc-400">{ADMIN_EMAIL}</span>.
        </p>
      </div>
    </div>
  );
}
