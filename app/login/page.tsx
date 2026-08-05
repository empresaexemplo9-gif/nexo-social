'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function LoginPage() {
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('thiagohccarvalho00@gmail.com');
  const [password, setPassword] = useState<string>('');
  const [organizationName, setOrganizationName] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage('✓ Conta e organização criadas com sucesso!');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setMessage('✓ Autenticação realizada com sucesso! Redirecionando...');
        window.location.href = '/admin';
      }
    } catch (err: any) {
      setMessage(`❌ ${err.message || 'Falha na autenticação'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6">
        <div className="text-center">
          <Link href="/" className="text-xl font-bold text-white">
            nexo<span className="text-emerald-400">.social</span>
          </Link>
          <h2 className="text-lg font-semibold text-white mt-4">
            {isRegistering ? 'Criar Conta Multi-Tenant' : 'Acesso Administrador'}
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {isRegistering ? 'Cadastre uma nova organização' : 'Entre com suas credenciais de acesso'}
          </p>
        </div>

        {message && (
          <div className="bg-zinc-950 border border-zinc-800 text-xs p-3 rounded-xl text-center">
            {message}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isRegistering && (
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Nome da Organização</label>
              <input
                type="text" required value={organizationName} onChange={e => setOrganizationName(e.target.value)}
                placeholder="Ex: Minha Empresa / Agência"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-zinc-400 block mb-1">E-mail do Administrador</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">Senha</label>
            <input
              type="password" required value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm py-2.5 rounded-xl transition"
          >
            {loading ? 'Processando...' : isRegistering ? 'Criar Conta Multi-Tenant' : 'Entrar no Painel Admin'}
          </button>
        </form>

        <div className="text-center pt-2">
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-xs text-zinc-400 hover:text-emerald-400 underline transition"
          >
            {isRegistering ? 'Já possui conta? Fazer Login' : 'Criar nova organização Multi-Tenant'}
          </button>
        </div>
      </div>
    </div>
  );
}
