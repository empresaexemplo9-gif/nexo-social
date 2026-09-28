'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Selo } from '@/components/Logo';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { ADMIN_EMAIL, isPlatformAdmin, type AccountType } from '@/lib/auth';
import { describeAuthError } from '@/lib/auth-errors';
import { ensureProfile } from '@/lib/provisioning';
import { safeAuthDestination } from '@/lib/auth-redirect';
import { getSupabaseEnv } from '@/lib/supabase-config';

/**
 * Destino depois de entrar (`?next=`), vindo por exemplo do link de convite de
 * um grupo. Só caminhos internos: `//site` e `/\site` levariam para fora.
 */
function destinoSeguro(raw: string | null): string | null {
  return safeAuthDestination(raw);
}

export default function LoginPage() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [next, setNext] = useState<string | null>(null);

  // Lido do endereço no navegador (sem useSearchParams, que obrigaria um
  // Suspense só para isso). `?cadastro=1` abre direto em "Criar conta".
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNext(destinoSeguro(params.get('next')));
    if (params.get('cadastro') === '1') setIsRegistering(true);
    const errors: Record<string, string> = {
      oauth_cancelled: 'A entrada foi cancelada ou recusada. Tente novamente.',
      invalid_callback: 'Este link expirou ou foi aberto em outro navegador. Inicie o acesso novamente.',
      auth_unavailable: 'Não foi possível concluir o acesso. Tente novamente.',
      profile_unavailable: 'Sua sessão foi validada, mas não foi possível preparar seu perfil. Entre novamente para tentar de novo.',
    };
    if (params.get('error')) setMessage(errors[params.get('error')!] ?? 'Não foi possível concluir o acesso.');
  }, []);
  const [accountType, setAccountType] = useState<AccountType>('pessoal');
  const [fullName, setFullName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    if (!supabase) { setMessage('Login temporariamente indisponível.'); return; }
    setLoading(true);
    setMessage('');
    try {
      const config = getSupabaseEnv();
      const settingsResponse = await fetch(`${config.url}/auth/v1/settings`, {
        headers: { apikey: config.anonKey }, cache: 'no-store', signal: AbortSignal.timeout(10000),
      });
      if (!settingsResponse.ok) throw new Error('Não foi possível consultar o serviço de login. Tente novamente.');
      const settings = await settingsResponse.json();
      if (!settings.external?.google) throw new Error('A entrada com Google ainda está sendo configurada. Use e-mail e senha por enquanto.');
      const callback = new URL('/auth/callback', window.location.origin);
      if (next) callback.searchParams.set('next', next);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google', options: { redirectTo: callback.toString(), queryParams: { prompt: 'select_account' } },
      });
      if (error) throw error;
      if (!data.url) throw new Error('Não foi possível iniciar o login com Google.');
    } catch (err) { setMessage(describeAuthError(err)); setLoading(false); }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!isSupabaseConfigured || !supabase) {
      setMessage(
        'O login está temporariamente indisponível. Tente novamente mais tarde.',
      );
      return;
    }

    setLoading(true);
    try {
      const tenantName = accountType === 'organizacao' ? organizationName : fullName;

      if (isRegistering) {
        // O servidor mantém a confirmação de titularidade do e-mail.
        const res = await fetch('/api/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim().toLowerCase(), password, fullName, accountType, tenantName, next }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Falha ao criar a conta.');

        if (json.confirmacaoPendente) {
          // A conta existe; só não pôde ser autoconfirmada pelo servidor.
          setMessage('✓ Conta criada! Confirme o e-mail que enviamos e depois faça login.');
          if (json.aviso) console.warn('[signup]', json.aviso);
          setIsRegistering(false);
          return;
        }

        // Já entra com a conta recém-criada.
        setMessage('✓ Conta criada! Entrando…');
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (signInError) throw signInError;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (error) throw error;
        setMessage('✓ Autenticação realizada! Preparando sua conta…');
      }

      // Idempotente: cria tenant + perfil se estiverem faltando. Conserta tanto
      // contas antigas quanto qualquer falha silenciosa do gatilho de cadastro.
      const { data: { user }, error: sessionError } = await supabase.auth.getUser();
      if (sessionError || !user) throw new Error('Não foi possível validar sua sessão. Tente entrar novamente.');
      const metadata = user.user_metadata ?? {};
      const prov = await ensureProfile(metadata.full_name || fullName, metadata.tenant_name || tenantName,
        metadata.account_type === 'organizacao' ? 'organizacao' : accountType);
      if (!prov.ok) throw new Error('Sua sessão foi validada, mas não foi possível preparar o perfil. Tente entrar novamente.');

      window.location.href = next ?? (isPlatformAdmin(user.email) ? '/admin' : '/');
    } catch (err: any) {
      // Loga o objeto completo no console do navegador para depuração fina.
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
            <span className="font-display text-2xl font-bold text-zinc-50">
              nexo<span className="text-clay-500">.</span>social
            </span>
          </Link>
          <h2 className="mt-4 text-lg font-semibold text-zinc-50">
            {isRegistering ? 'Criar conta' : 'Entrar na plataforma'}
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            {next?.startsWith('/comunidade/convite/')
              ? 'Depois de entrar, você já cai no grupo para o qual foi convidado'
              : isRegistering
                ? 'Crie sua conta para acessar a plataforma'
                : 'Faça login para acessar a plataforma'}
          </p>
        </div>

        {message && (
          <div role="status" aria-live="polite" className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-center text-xs">{message}</div>
        )}

        <button type="button" onClick={handleGoogle} disabled={loading}
          className="w-full rounded-xl border border-zinc-600 bg-white px-4 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-60">
          {loading ? 'Aguarde…' : 'Continuar com Google'}
        </button>
        <p className="text-center text-xs text-zinc-400">Use sua conta Google ou Gmail. No primeiro acesso, sua conta pessoal é criada automaticamente.</p>
        <div className="text-center text-xs text-zinc-500">ou continue com e-mail e senha</div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isRegistering && (
            <>
              {/* Tipo de conta */}
              <div className="grid grid-cols-2 gap-2">
                {(['pessoal', 'organizacao'] as AccountType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setAccountType(type)}
                    className={"action-collage " + (`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                      accountType === type
                        ? 'border-emerald-600 bg-emerald-950/40 text-emerald-400'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-50'
                    }`)}
                  >
                    {type === 'pessoal' ? '👤 Conta Pessoal' : '🏢 Organização'}
                  </button>
                ))}
              </div>

              <div>
                <label className="mb-1 block text-xs text-zinc-400">Seu nome</label>
                <input
                  type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nome completo"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {accountType === 'organizacao' && (
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Nome da organização</label>
                  <input
                    type="text" required value={organizationName} onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="Ex: Minha Empresa / Agência"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              )}
            </>
          )}

          <div>
            <label className="mb-1 block text-xs text-zinc-400">E-mail</label>
            <input
              type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-400">Senha</label>
            <input
              type="password" autoComplete={isRegistering ? 'new-password' : 'current-password'} required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" minLength={6}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full rounded-xl action-patch action-patch--cobalt bg-emerald-500 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-60"
          >
            {loading ? 'Processando…' : isRegistering ? 'Criar conta' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-400">
          Consulte os <Link href="/termos" className="underline hover:text-zinc-50">Termos de Serviço</Link> e saiba como seus dados são usados na <Link href="/privacidade" className="underline hover:text-zinc-50">Política de Privacidade</Link>.
        </p>

        <div className="text-center">
          <button
            onClick={() => { setIsRegistering(!isRegistering); setMessage(''); }}
            className="action-collage action-collage--paper text-xs text-zinc-400 underline transition hover:text-emerald-400"
          >
            {isRegistering ? 'Já possui conta? Fazer login' : 'Não tem conta? Criar agora'}
          </button>
        </div>

        <p className="border-t border-zinc-800 pt-4 text-center text-[11px] leading-relaxed text-zinc-500">
          O painel administrativo global é exclusivo da conta{' '}
          <span className="font-mono text-zinc-400">{ADMIN_EMAIL}</span>.
        </p>
      </div>
    </div>
  );
}
