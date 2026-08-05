'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { ADMIN_EMAIL, isPlatformAdmin, tenantSlug, type AccountType } from '@/lib/auth';

export default function LoginPage() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>('pessoal');
  const [fullName, setFullName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!isSupabaseConfigured || !supabase) {
      setMessage(
        '⚠️ Modo demonstração: configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para ativar contas multi-tenant.',
      );
      return;
    }

    setLoading(true);
    try {
      if (isRegistering) {
        const tenantName = accountType === 'organizacao' ? organizationName : fullName;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              account_type: accountType,
              tenant_name: tenantName,
              tenant_slug: tenantSlug(tenantName || email),
              is_platform_admin: isPlatformAdmin(email),
            },
          },
        });
        if (error) throw error;
        setMessage('✓ Conta criada! Verifique seu e-mail para confirmar o cadastro e faça login.');
        setIsRegistering(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage('✓ Autenticação realizada! Redirecionando…');
        window.location.href = isPlatformAdmin(email) ? '/admin' : '/conta';
      }
    } catch (err: any) {
      setMessage(`❌ ${err.message || 'Falha na autenticação'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 text-zinc-100">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
        <div className="text-center">
          <Link href="/" className="text-xl font-bold text-white">
            nexo<span className="text-emerald-400">.social</span>
          </Link>
          <h2 className="mt-4 text-lg font-semibold text-white">
            {isRegistering ? 'Criar conta' : 'Entrar na plataforma'}
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            {isRegistering
              ? 'Cadastre uma conta pessoal ou uma organização (multi-tenant)'
              : 'Acesse sua conta para gerenciar e personalizar'}
          </p>
        </div>

        {message && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-center text-xs">{message}</div>
        )}

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
                    className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                      accountType === type
                        ? 'border-emerald-600 bg-emerald-950/40 text-emerald-400'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                    }`}
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
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {accountType === 'organizacao' && (
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Nome da organização</label>
                  <input
                    type="text" required value={organizationName} onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="Ex: Minha Empresa / Agência"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              )}
            </>
          )}

          <div>
            <label className="mb-1 block text-xs text-zinc-400">E-mail</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-400">Senha</label>
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" minLength={6}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-60"
          >
            {loading ? 'Processando…' : isRegistering ? 'Criar conta' : 'Entrar'}
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={() => { setIsRegistering(!isRegistering); setMessage(''); }}
            className="text-xs text-zinc-400 underline transition hover:text-emerald-400"
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
