'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Icon from './icons';
import { usePreferences } from '@/lib/preferences';
import { MUSIC_GENRES, genreLabel } from '@/lib/taxonomy';

interface Faixa {
  id: string;
  name: string;
  artist: string;
  album: string;
  image: string | null;
  ano: number | null;
  url: string;
  embedUrl: string;
}
interface Playlist {
  id: string;
  name: string;
  owner: string;
  url: string;
  embedUrl: string;
}
interface Lista {
  id: string;
  titulo: string;
  apoio: string;
  faixas: Faixa[];
}
interface Trilha {
  rodada: number;
  rodadas: number;
  playlist: Playlist | null;
  listas: Lista[];
}

/** Como a trilha está sendo montada, em uma linha — com o caminho para mudar. */
const JEITOS: Record<string, string> = {
  'misturar:0': 'lançamentos e descobertas, fora dos hits',
  'misturar:1': 'lançamentos, clássicos e descobertas',
  'famosas:1': 'os hits do estilo',
  'famosas:0': 'conhecidas, sem as mais batidas',
  'lancamentos:1': 'só lançamentos, os em alta primeiro',
  'lancamentos:0': 'só lançamentos, fora dos hits',
};

type Estado = { tipo: 'carregando' } | { tipo: 'ok'; trilha: Trilha } | { tipo: 'off'; msg: string } | { tipo: 'erro'; msg: string };

/** Qual gênero abre primeiro: vira todo dia, para a trilha não começar sempre igual. */
function generoDoDia(generos: string[]): string {
  const dia = Math.floor(Date.now() / 86_400_000);
  return generos[dia % generos.length];
}

function ListaDeFaixas({
  titulo,
  apoio,
  faixas,
  tocando,
  onTocar,
}: {
  titulo: string;
  apoio: string;
  faixas: Faixa[];
  tocando: string | null;
  onTocar: (f: Faixa) => void;
}) {
  if (!faixas.length) return null;
  return (
    <div>
      <p className="rotulo-hud">{titulo}</p>
      <p className="mt-1 text-xs text-zinc-400">{apoio}</p>
      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {faixas.map((f) => {
          const ativa = tocando === f.id;
          return (
            <li key={f.id} className="flex items-stretch gap-1">
              <button
                type="button"
                onClick={() => onTocar(f)}
                aria-pressed={ativa}
                className={`group flex min-w-0 flex-1 items-center gap-3 rounded-xl border p-2.5 text-left transition ${
                  ativa
                    ? 'border-emerald-400/70 bg-emerald-400/10 shadow-[0_0_14px_-4px_rgba(31,208,242,0.7)]'
                    : 'border-zinc-800/80 bg-zinc-900/60 hover:border-emerald-400/40'
                }`}
              >
                <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                  {f.image ? (
                    <img src={f.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-zinc-500">
                      <Icon name="music" size={18} />
                    </span>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-zinc-950/60 text-emerald-300 opacity-0 transition group-hover:opacity-100">
                    <Icon name="play" size={16} />
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-xs font-medium ${ativa ? 'text-emerald-200' : 'text-zinc-100 group-hover:text-emerald-300'}`}>
                    {f.name}
                  </span>
                  <span className="block truncate text-[11px] text-zinc-500">
                    {f.artist}
                    {f.ano ? ` · ${f.ano}` : ''}
                  </span>
                </span>
              </button>
              <a
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir no Spotify"
                aria-label={`Abrir ${f.name} no Spotify`}
                className="flex w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-800/80 bg-zinc-900/60 text-zinc-500 transition hover:border-emerald-400/40 hover:text-emerald-300"
              >
                <Icon name="external" size={13} />
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Trilha do perfil — só com os gêneros que a pessoa escolheu, e fugindo dos
 * hits: uma playlist de descoberta, lançamentos recentes e faixas de artistas
 * fora do topo. A seleção de cada gênero muda todo dia; "Outras descobertas"
 * troca na hora. O player embutido toca de graça (com anúncios no plano
 * gratuito do Spotify).
 */
export default function ProfilePlaylist() {
  const { prefs, ready } = usePreferences();
  const generos = useMemo(
    () => (prefs.musicGenres ?? []).filter((g) => MUSIC_GENRES.some((m) => m.id === g)),
    [prefs.musicGenres],
  );
  const [ativo, setAtivo] = useState<string | null>(null);
  const [rodada, setRodada] = useState(0);
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });
  const [tocando, setTocando] = useState<Faixa | null>(null);
  // Troca de aba não refaz a busca: cada gênero/rodada é pedido uma vez.
  const guardadas = useRef(new Map<string, Trilha>());

  useEffect(() => {
    if (!generos.length) return;
    setAtivo((atual) => (atual && generos.includes(atual) ? atual : generoDoDia(generos)));
  }, [generos]);

  const hits = prefs.musicHits === true;
  const mix = prefs.musicMix ?? 'misturar';

  const carregar = useCallback(async (genero: string, r: number) => {
    const chave = `${genero}:${r}:${hits ? 1 : 0}:${mix}`;
    const ja = guardadas.current.get(chave);
    if (ja) {
      setEstado({ tipo: 'ok', trilha: ja });
      return;
    }
    setEstado({ tipo: 'carregando' });
    try {
      const res = await fetch(
        `/api/playlist?genre=${encodeURIComponent(genero)}&rodada=${r}&hits=${hits ? 1 : 0}&mix=${encodeURIComponent(mix)}`,
      );
      const json = await res.json().catch(() => ({}));
      if (res.status === 503) {
        setEstado({ tipo: 'off', msg: json.hint || json.error || '' });
        return;
      }
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      const trilha: Trilha = {
        rodada: json.rodada ?? r,
        rodadas: json.rodadas ?? 1,
        playlist: json.playlist ?? null,
        listas: json.listas ?? [],
      };
      guardadas.current.set(chave, trilha);
      setEstado({ tipo: 'ok', trilha });
    } catch (e: any) {
      setEstado({ tipo: 'erro', msg: e?.message || 'Falha ao carregar a trilha.' });
    }
  }, [hits, mix]);

  useEffect(() => {
    if (!ready || !ativo) return;
    setTocando(null);
    void carregar(ativo, rodada);
  }, [ready, ativo, rodada, carregar]);

  if (!ready) return <p className="text-sm text-zinc-400">Montando sua trilha…</p>;

  // Sem gêneros escolhidos não inventamos gosto: pedimos.
  if (!generos.length) {
    return (
      <div className="card-soft cantos-hud flex flex-col items-start gap-3 p-6">
        <p className="text-sm text-zinc-200">
          Escolha os estilos que você ouve e a trilha passa a trazer lançamentos e descobertas só deles.
        </p>
        <Link
          href="/questionario#q-musica"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-xs font-semibold text-zinc-950 shadow-glow hover:bg-emerald-300"
        >
          Escolher meus estilos <Icon name="arrowRight" size={14} />
        </Link>
      </div>
    );
  }

  const trilha = estado.tipo === 'ok' ? estado.trilha : null;
  const embed = tocando
    ? { src: tocando.embedUrl, altura: 152, titulo: tocando.name }
    : trilha?.playlist
      ? { src: trilha.playlist.embedUrl, altura: 380, titulo: trilha.playlist.name }
      : null;

  return (
    <div className="space-y-4">
      {/* Um botão por gênero escolhido — e só esses */}
      <div className="flex flex-wrap items-center gap-2">
        {generos.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => {
              setAtivo(g);
              setRodada(0);
            }}
            aria-pressed={g === ativo}
            className={`rounded-lg px-3.5 py-2 text-xs font-medium transition ${
              g === ativo
                ? 'bg-emerald-400 text-zinc-950 shadow-glow'
                : 'border border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-emerald-400/40 hover:text-zinc-50'
            }`}
          >
            {genreLabel(MUSIC_GENRES, g)}
          </button>
        ))}
        {trilha && trilha.rodadas > 1 && (
          <button
            type="button"
            onClick={() => setRodada((r) => (r + 1) % trilha.rodadas)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-clay-500/40 px-3 py-2 text-xs font-medium text-clay-300 transition hover:bg-clay-500/10"
          >
            <Icon name="refresh" size={13} /> Outras descobertas
          </button>
        )}
      </div>

      {estado.tipo === 'carregando' && (
        <div className="h-[380px] animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/40" aria-busy="true" />
      )}

      {estado.tipo === 'off' && (
        <div className="rounded-2xl border border-clay-800/50 bg-clay-950/20 p-5 text-sm text-clay-200">
          <p className="font-semibold">Spotify ainda não conectado.</p>
          <p className="mt-1 text-xs">{estado.msg}</p>
        </div>
      )}

      {estado.tipo === 'erro' && ativo && (
        <div className="rounded-2xl border border-red-900/60 bg-red-950/25 p-5 text-sm text-red-200">
          <p className="font-semibold">Não foi possível montar a trilha de {genreLabel(MUSIC_GENRES, ativo)}.</p>
          <p className="mt-1 text-xs">{estado.msg}</p>
          <button onClick={() => void carregar(ativo, rodada)} className="mt-3 rounded-xl border border-red-800 px-3 py-1.5 text-xs">
            Tentar de novo
          </button>
        </div>
      )}

      {trilha && (
        <>
          {embed ? (
            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
              <iframe
                key={embed.src}
                src={`${embed.src}?utm_source=nexo-social`}
                width="100%"
                height={embed.altura}
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                title={embed.titulo}
                className="block"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800 px-4 py-3">
                {tocando ? (
                  <>
                    <p className="text-xs text-zinc-400">
                      <span className="text-zinc-200">{tocando.name}</span> · {tocando.artist}
                    </p>
                    {trilha.playlist && (
                      <button type="button" onClick={() => setTocando(null)} className="text-xs font-medium text-emerald-400 hover:text-emerald-300">
                        Voltar para a playlist
                      </button>
                    )}
                  </>
                ) : (
                  trilha.playlist && (
                    <>
                      <p className="text-xs text-zinc-400">
                        <span className="text-zinc-200">{trilha.playlist.name}</span> · por {trilha.playlist.owner}
                      </p>
                      <a
                        href={trilha.playlist.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300"
                      >
                        Abrir no Spotify <Icon name="external" size={13} />
                      </a>
                    </>
                  )
                )}
              </div>
            </div>
          ) : (
            <p className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 text-center text-sm text-zinc-400">
              Nenhuma playlist deste estilo com esse perfil hoje — ouça as faixas abaixo.
            </p>
          )}

          {trilha.listas.map((l) => (
            <ListaDeFaixas
              key={l.id}
              titulo={l.titulo}
              apoio={l.apoio}
              faixas={l.faixas}
              tocando={tocando?.id ?? null}
              onTocar={setTocando}
            />
          ))}

          <p className="text-xs text-zinc-400">
            Montada com {JEITOS[`${mix}:${hits ? 1 : 0}`]}.{' '}
            <Link href="/questionario#q-musica" className="font-medium text-emerald-400 hover:text-emerald-300">
              Mudar no questionário
            </Link>
          </p>

          <p className="flex items-start gap-2 text-[11px] leading-relaxed text-zinc-500">
            <Icon name="alert" size={13} className="mt-0.5 shrink-0" />
            Reprodução pelo player oficial do Spotify: no plano gratuito, toca com anúncios. Com Premium, sem anúncios.
          </p>
        </>
      )}
    </div>
  );
}
