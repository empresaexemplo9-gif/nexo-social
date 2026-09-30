'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon, { type IconName } from './icons';
import LogoMark from './Logo';
import NotificationsBell from './NotificationsBell';
import InstallApp from './InstallApp';
import Avatar from './Avatar';
import { supabase } from '@/lib/supabase';
import { isPlatformAdmin } from '@/lib/auth';
import { TOPICS } from '@/lib/data';

// Navegação na lateral esquerda. No computador é uma barra fixa que o menu de
// três barras recolhe para só os ícones; no celular é uma gaveta que o mesmo
// botão abre por cima da página.
//
// A largura da barra e o recuo do conteúdo vêm do CSS (globals.css), lidos de
// `html[data-lateral]` — atributo que um script no <head> (app/layout.tsx)
// aplica ANTES da página pintar. Assim quem deixou a barra recolhida não vê
// ela abrir e fechar a cada carregamento.

const CHAVE_LATERAL = 'nexo:lateral';

type Perfil = { nome: string; avatar: string | null };

const PRINCIPAIS: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Início', icon: 'sparkles' },
  { href: '/descobrir', label: 'Descobrir', icon: 'grade' },
  { href: '/shorts', label: 'Shorts', icon: 'shorts' },
  { href: '/revista', label: 'Revista', icon: 'jornal' },
  { href: '/agenda', label: 'Agenda', icon: 'calendarCheck' },
  { href: '/comunidade', label: 'Comunidade', icon: 'users' },
  { href: '/esporte', label: 'Esporte ao vivo', icon: 'trophy' },
  { href: '/livros', label: 'Livros que li esse ano', icon: 'library' },
  { href: '/bom-dia', label: 'Bom Dia', icon: 'sunrise' },
  { href: '/questionario', label: 'Questionário', icon: 'compass' },
  { href: '/busca', label: 'Buscar', icon: 'search' },
];

function ativo(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

/** Botão de três barras. */
function BotaoMenu({ onClick, aberto, rotulo }: { onClick: () => void; aberto?: boolean; rotulo: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      aria-expanded={aberto}
      title={rotulo}
      className="menu-denim flex h-10 w-10 shrink-0 items-center justify-center"
    >
      <Icon name="menu" size={22} />
    </button>
  );
}

function Marca({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/" onClick={onClick} className="group flex min-w-0 items-center gap-2.5" aria-label="nexo.social — início">
      <LogoMark size={38} disco className="shrink-0 transition duration-500 group-hover:-rotate-12" />
      <span className="rotulo-menu min-w-0">
        <span className="block truncate font-display text-[1.35rem] font-bold leading-none tracking-tight text-zinc-50">
          nexo<span className="text-clay-500 transition group-hover:text-emerald-400">.</span>social
        </span>
        <span className="mt-1 block truncate font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-500">
          cultura · novidade
        </span>
      </span>
    </Link>
  );
}

/** Foto e nome de quem está logado, no topo do menu. */
function CartaoPerfil({ perfil, email, ativoAgora, onNavegar }: { perfil: Perfil | null; email: string; ativoAgora: boolean; onNavegar: () => void }) {
  const nome = perfil?.nome || email.split('@')[0];
  return (
    <Link
      href="/conta"
      onClick={onNavegar}
      title="Minha conta"
      aria-label={`Minha conta — ${nome}`}
      aria-current={ativoAgora ? 'page' : undefined}
      className={`item-menu menu-denim flex items-center gap-3 px-2 py-2 ${ativoAgora ? 'menu-denim--active' : ''}`}
    >
      <Avatar nome={nome} path={perfil?.avatar} tamanho={40} className="ring-2 ring-emerald-400/30" />
      <span className="rotulo-menu min-w-0">
        {/* Sem cor própria: herda a do botão do menu (legível no azul). */}
        <span className="block truncate text-sm font-semibold">{nome}</span>
        <span className="block truncate text-[11px] opacity-75">Minha conta</span>
      </span>
    </Link>
  );
}

/** Conteúdo da navegação — o mesmo na barra do computador e na gaveta do celular. */
function ConteudoMenu({
  pathname,
  email,
  perfil,
  lateral,
  onNavegar,
  onSair,
  onAbrirTemas,
}: {
  pathname: string;
  email: string | null;
  perfil: Perfil | null;
  lateral: boolean;
  onNavegar: () => void;
  onSair: () => void;
  onAbrirTemas: () => void;
}) {
  const admin = isPlatformAdmin(email);
  const [temasAbertos, setTemasAbertos] = useState(pathname.startsWith('/tema'));
  const item = (on: boolean) =>
    `item-menu menu-denim flex items-center gap-3 px-3 py-2.5 text-sm ${on ? 'menu-denim--active' : ''}`;

  return (
    <>
      {email && (
        <div className="border-b border-emerald-400/10 px-3 py-3">
          <CartaoPerfil perfil={perfil} email={email} ativoAgora={ativo(pathname, '/conta')} onNavegar={onNavegar} />
        </div>
      )}
      <nav aria-label="Navegação principal" className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {PRINCIPAIS.map((l) => (
          <Link key={l.href} href={l.href} onClick={onNavegar} className={item(ativo(pathname, l.href))} aria-current={ativo(pathname, l.href) ? 'page' : undefined} aria-label={l.label} title={l.label}>
            <Icon name={l.icon} size={19} className="shrink-0" />
            <span className="rotulo-menu truncate">{l.label}</span>
          </Link>
        ))}

        <div className="pt-3">
          <button
            type="button"
            onClick={() => {
              setTemasAbertos((v) => !v);
              onAbrirTemas();
            }}
            aria-expanded={temasAbertos}
            className={`${item(pathname.startsWith('/tema'))} w-full`}
            data-active={pathname.startsWith('/tema') || undefined}
            aria-label="Temas"
            title="Temas"
          >
            <Icon name="star" size={19} className="shrink-0" />
            <span className="rotulo-menu flex-1 truncate text-left">Temas</span>
            <Icon name="chevronRight" size={14} className={`so-expandida shrink-0 transition ${temasAbertos ? 'rotate-90' : ''}`} />
          </button>
          {temasAbertos && (
            <div className="so-expandida mt-1 space-y-0.5 border-l border-zinc-800 pl-2 ml-5">
              {TOPICS.map((t) => (
                <Link
                  key={t.slug}
                  href={`/tema/${t.slug}`}
                  onClick={onNavegar}
                  className="menu-denim menu-denim--subtle flex items-center gap-2.5 px-2.5 py-2 text-sm"
                  aria-current={pathname === `/tema/${t.slug}` ? 'page' : undefined}
                >
                  <span>
                    <Icon name={t.icon} size={15} />
                  </span>
                  <span className="truncate">{t.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>

      <div className="space-y-1 border-t border-emerald-400/10 px-3 py-3">
        <div className="so-expandida px-1 pb-1">
          <InstallApp compacto className="menu-denim" />
        </div>
        {email ? (
          <>
            <NotificationsBell lateral={lateral} rotulo={lateral ? undefined : 'Notificações'} className="menu-denim" />
            {admin && (
              <Link href="/admin" onClick={onNavegar} className={item(ativo(pathname, '/admin'))} aria-current={ativo(pathname, '/admin') ? 'page' : undefined} title="Painel">
                <Icon name="plug" size={19} className="shrink-0" />
                <span className="rotulo-menu truncate">Painel</span>
              </Link>
            )}
            <button type="button" onClick={onSair} className={`${item(false)} w-full`} title="Sair">
              <Icon name="arrowRight" size={19} className="shrink-0" />
              <span className="rotulo-menu">Sair</span>
            </button>
          </>
        ) : (
          <Link href="/login" onClick={onNavegar} className={item(ativo(pathname, '/login'))} title="Entrar">
            <Icon name="user" size={19} className="shrink-0" />
            <span className="rotulo-menu">Entrar</span>
          </Link>
        )}
      </div>
    </>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [gaveta, setGaveta] = useState(false);
  const [recolhida, setRecolhida] = useState(false);

  useEffect(() => {
    setRecolhida(document.documentElement.dataset.lateral === 'recolhida');
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setEmail(data.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setEmail(session?.user?.email ?? null));
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Nome e foto de perfil para o topo do menu.
  useEffect(() => {
    if (!email) { setPerfil(null); return; }
    let active = true;
    fetch('/api/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (active && j) setPerfil({ nome: j.profile?.full_name || '', avatar: j.profile?.avatar_path ?? null });
      })
      .catch(() => undefined);
    const trocouFoto = (e: Event) => {
      const avatar = (e as CustomEvent<{ avatar_path: string | null }>).detail?.avatar_path ?? null;
      setPerfil((p) => ({ nome: p?.nome || '', avatar }));
    };
    window.addEventListener('nexo:perfil', trocouFoto);
    return () => {
      active = false;
      window.removeEventListener('nexo:perfil', trocouFoto);
    };
  }, [email]);

  // Trocou de página: a gaveta fecha.
  useEffect(() => setGaveta(false), [pathname]);

  // Esc fecha a gaveta; com ela aberta a página por trás não rola.
  useEffect(() => {
    if (!gaveta) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setGaveta(false);
    document.addEventListener('keydown', onKey);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = antes;
    };
  }, [gaveta]);

  const alternarLateral = useCallback((forcar?: boolean) => {
    const proxima = forcar ?? document.documentElement.dataset.lateral !== 'recolhida';
    if (proxima) document.documentElement.dataset.lateral = 'recolhida';
    else delete document.documentElement.dataset.lateral;
    try {
      window.localStorage.setItem(CHAVE_LATERAL, proxima ? 'recolhida' : 'aberta');
    } catch {
      /* armazenamento indisponível: vale só nesta visita */
    }
    setRecolhida(proxima);
  }, []);

  const sair = async () => {
    if (supabase) await supabase.auth.signOut();
    setEmail(null);
    window.location.href = '/';
  };

  return (
    <>
      {/* Computador: barra lateral fixa */}
      <aside
        className="barra-lateral fixed inset-y-0 left-0 z-50 hidden flex-col border-r border-emerald-400/10 bg-zinc-950/85 shadow-[1px_0_0_0_rgba(43,82,136,0.03),10px_0_40px_-24px_rgba(43,82,136,0.19)] backdrop-blur-xl lg:flex"
        aria-label="Menu"
      >
        <div className="flex h-16 items-center gap-2 border-b border-emerald-400/10 px-3">
          <BotaoMenu
            onClick={() => alternarLateral()}
            aberto={!recolhida}
            rotulo={recolhida ? 'Abrir o menu' : 'Recolher o menu'}
          />
          <span className="so-expandida min-w-0">
            <Marca />
          </span>
        </div>
        <ConteudoMenu
          pathname={pathname}
          email={email}
          perfil={perfil}
          lateral
          onNavegar={() => undefined}
          onSair={sair}
          // Recolhida, "Temas" não cabe: abre a barra para mostrar a lista.
          onAbrirTemas={() => recolhida && alternarLateral(false)}
        />
      </aside>

      {/* Celular e tablet: barra de cima com o menu de três barras */}
      <header
        className="sticky top-0 z-40 border-b border-emerald-400/10 bg-zinc-950/80 backdrop-blur-xl lg:hidden"
        // Instalado no iOS, a barra de status fica SOBRE o conteúdo (viewport-fit
        // cover + status bar translúcida). Sem este respiro, o logo e o menu
        // ficam embaixo do relógio e da bateria.
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex h-14 items-center gap-2 px-3">
          <BotaoMenu onClick={() => setGaveta(true)} aberto={gaveta} rotulo="Abrir o menu" />
          <Marca />
          <div className="ml-auto flex items-center gap-1">
            <Link href="/busca" className="menu-denim p-2" aria-label="Buscar">
              <Icon name="search" size={20} />
            </Link>
            {email && <NotificationsBell />}
            {email && (
              <Link href="/conta" aria-label="Minha conta" className="ml-1 rounded-full">
                <Avatar nome={perfil?.nome || email} path={perfil?.avatar} tamanho={30} />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Gaveta do celular */}
      {gaveta && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm"
            onClick={() => setGaveta(false)}
            aria-label="Fechar o menu"
          />
          <div
            className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col border-r border-emerald-400/15 bg-zinc-950 shadow-neon"
            style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="flex h-14 items-center gap-2 border-b border-emerald-400/10 px-3">
              <button
                type="button"
                onClick={() => setGaveta(false)}
                aria-label="Fechar o menu"
                className="menu-denim flex h-10 w-10 items-center justify-center"
              >
                <Icon name="close" size={20} />
              </button>
              <Marca onClick={() => setGaveta(false)} />
            </div>
            <ConteudoMenu
              pathname={pathname}
              email={email}
              perfil={perfil}
              lateral={false}
              onNavegar={() => setGaveta(false)}
              onSair={sair}
              onAbrirTemas={() => undefined}
            />
          </div>
        </div>
      )}
    </>
  );
}
