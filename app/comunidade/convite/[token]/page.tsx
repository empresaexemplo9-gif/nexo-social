import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Selo } from '@/components/Logo';
import Icon from '@/components/icons';
import EntrarNoGrupo from '@/components/comunidade/EntrarNoGrupo';
import Avatar from '@/components/Avatar';
import { createServerSupabase } from '@/lib/supabase-server';
import { urlPublica } from '@/lib/imagens-url';

export const dynamic = 'force-dynamic';

interface Previa {
  group_id: string;
  name: string;
  description: string | null;
  image_path: string | null;
  owner_name: string;
  member_count: number;
  already_member: boolean;
}

/** O grupo do link — visível a quem ainda não tem conta (group_invite_preview). */
async function previa(token: string) {
  const sb = createServerSupabase();
  if (!sb || !/^[0-9a-f]{16,64}$/i.test(token)) return { sb, grupo: null as Previa | null };
  const { data } = await sb.rpc('group_invite_preview', { p_token: token });
  return { sb, grupo: ((Array.isArray(data) ? data[0] : data) as Previa | undefined) ?? null };
}

export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const { grupo } = await previa(params.token);
  const title = grupo ? `Convite para o grupo ${grupo.name} — nexo.social` : 'Convite — nexo.social';
  const description = grupo
    ? `${grupo.owner_name} e mais ${Math.max(0, grupo.member_count - 1)} pessoa(s) compartilham livros, músicas e filmes e ouvem e assistem juntos.`
    : 'Grupos para compartilhar livros, músicas e filmes na nexo.social.';
  // A imagem do grupo vira a prévia do link no WhatsApp e no Telegram.
  const imagem = urlPublica(grupo?.image_path);
  return {
    title,
    description,
    openGraph: { title, description, ...(imagem ? { images: [{ url: imagem, width: 800, height: 800 }] } : {}) },
    robots: { index: false },
  };
}

/**
 * Link de convite de um grupo. Quem já tem conta entra com um toque; quem não
 * tem cria o acesso e volta para cá já logado, entrando no grupo.
 */
export default async function ConvitePage({ params }: { params: { token: string } }) {
  const { sb, grupo } = await previa(params.token);
  const user = sb ? (await sb.auth.getUser()).data.user : null;

  if (grupo && user && grupo.already_member) redirect(`/comunidade/${grupo.group_id}`);

  const aqui = `/comunidade/convite/${params.token}`;

  return (
    <div className="tela-sem-barra flex min-h-screen items-center justify-center p-4 text-zinc-100">
      <div className="card-soft cantos-hud w-full max-w-md space-y-6 p-8 text-center">
        <Link href="/" className="inline-flex flex-col items-center gap-2">
          <Selo size={88} girar textura />
          <span className="font-display text-2xl font-bold text-zinc-50">
            nexo<span className="text-clay-500">.</span>social
          </span>
        </Link>

        {!grupo ? (
          <div className="space-y-3">
            <h1 className="text-lg font-semibold text-zinc-50">Convite inválido</h1>
            <p className="text-sm text-zinc-400">
              O link pode ter sido trocado por quem criou o grupo. Peça um link novo para quem te convidou.
            </p>
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400">
              Conhecer a nexo.social <Icon name="arrowRight" size={16} />
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {grupo.image_path && <Avatar nome={grupo.name} path={grupo.image_path} tamanho={80} quadrado className="mx-auto" />}
              <p className="text-sm text-zinc-400">
                <span className="font-medium text-zinc-200">{grupo.owner_name}</span> convidou você para o grupo
              </p>
              <h1 className="text-2xl font-semibold text-zinc-50">{grupo.name}</h1>
              {grupo.description && <p className="text-sm text-zinc-300">{grupo.description}</p>}
              <p className="text-xs text-zinc-500">
                {grupo.member_count} {grupo.member_count === 1 ? 'pessoa já participa' : 'pessoas já participam'}
              </p>
            </div>

            <ul className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4 text-left text-xs text-zinc-300">
              <li className="flex gap-2">
                <Icon name="book" size={14} className="mt-0.5 shrink-0 text-emerald-400" /> Troque indicações de livros, filmes e séries
              </li>
              <li className="flex gap-2">
                <Icon name="headphones" size={14} className="mt-0.5 shrink-0 text-emerald-400" /> Ouça músicas e assista a clipes junto com o grupo,
                no mesmo segundo
              </li>
              <li className="flex gap-2">
                <Icon name="calendarCheck" size={14} className="mt-0.5 shrink-0 text-emerald-400" /> Marque compromissos e responda convites na
                própria agenda
              </li>
            </ul>

            {user ? (
              <EntrarNoGrupo token={params.token} />
            ) : (
              <div className="space-y-2">
                <Link
                  href={`/login?cadastro=1&next=${encodeURIComponent(aqui)}`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
                >
                  Criar meu acesso grátis <Icon name="arrowRight" size={16} />
                </Link>
                <Link
                  href={`/login?next=${encodeURIComponent(aqui)}`}
                  className="block w-full rounded-xl border border-zinc-800 py-3 text-sm text-zinc-300 transition hover:text-zinc-50"
                >
                  Já tenho conta — entrar
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
