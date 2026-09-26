'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Icon from './icons';
import { usePreferences } from '@/lib/preferences';
import { MUSIC_GENRES, genreLabel } from '@/lib/taxonomy';
import { useSpotify } from './spotify/SpotifyProvider';
import PlayerEmbutido from './spotify/PlayerEmbutido';

interface Faixa {
  id: string;
  name: string;
  artist: string;
  album: string;
  image: string | null;
  ano: number | null;
  /** Duração da faixa inteira (ms). */
  duracaoMs?: number | null;
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
                title="Ouvir completa no app do Spotify"
                aria-label={`Ouvir ${f.name} completa no app do Spotify`}
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

const BOTAO_PRIMARIO =
  'inline-flex items-center gap-1.5 rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-zinc-950 shadow-glow transition hover:bg-emerald-300';
const BOTAO_SECUNDARIO =
  'inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-emerald-400/50 hover:text-emerald-300';

/**
 * Como ouvir completo — o que o Spotify permite em cada caso:
 * sem conta, só prévias; conta grátis, completas no app do Spotify (com
 * anúncios); Premium, completas aqui dentro (sem anúncios), entrando com o
 * Spotify.
 */
function PainelSpotify({ linkApp }: { linkApp: string | null }) {
  const { status, nome, entrar, sair } = useSpotify();
  const voltarAqui = () => entrar(`${window.location.pathname}${window.location.search}#trilha`);
  const quem = nome ? <span className="text-zinc-100">{nome}</span> : 'sua conta';
  const noApp = linkApp && (
    <a href={linkApp} target="_blank" rel="noopener noreferrer" className={BOTAO_PRIMARIO}>
      Ouvir completo no app do Spotify <Icon name="external" size={13} />
    </a>
  );
  const botaoSair = (
    <button type="button" onClick={() => void sair()} className="text-xs font-medium text-zinc-400 transition hover:text-zinc-100">
      Sair do Spotify
    </button>
  );

  if (status === 'conectando') {
    return (
      <p className="flex items-center gap-2 text-xs text-zinc-400" aria-live="polite">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Ligando o player do Spotify…
      </p>
    );
  }

  if (status === 'pronto') {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-emerald-400/30 bg-emerald-400/5 px-4 py-3">
        <p className="flex-1 text-xs text-zinc-300">
          <Icon name="headphones" size={14} className="-mt-0.5 mr-1.5 inline text-emerald-400" />
          Conectado como {quem} · Premium — as faixas tocam completas aqui, sem anúncios.
        </p>
        {botaoSair}
      </div>
    );
  }

  if (status === 'sem-premium' || status === 'sem-suporte') {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-clay-500/30 bg-clay-500/5 px-4 py-3">
        <p className="min-w-[14rem] flex-1 text-xs leading-relaxed text-zinc-300">
          {status === 'sem-premium' ? (
            <>
              Conectado como {quem}, no plano grátis. O Spotify só toca completo dentro de outros sites para
              Premium — aqui seguem as prévias; completo, com anúncios, no app do Spotify.
            </>
          ) : (
            <>
              Conectado como {quem}, mas este navegador não consegue tocar o Spotify por dentro (comum no celular).
              Ouça completo no app do Spotify.
            </>
          )}
        </p>
        <div className="flex items-center gap-4">
          {noApp}
          {botaoSair}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-300">
        <span className="font-semibold text-zinc-100">Aqui tocam prévias de 30 s.</span> Para ouvir as faixas completas:
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={voltarAqui}
          className="flex items-center gap-3 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-left transition hover:border-emerald-400/70 hover:bg-emerald-400/15"
        >
          <Icon name="headphones" size={18} className="shrink-0 text-emerald-300" />
          <span>
            <span className="block text-sm font-semibold text-emerald-200">Entrar com Spotify</span>
            <span className="block text-[11px] text-zinc-400">Premium: completas aqui, sem anúncios</span>
          </span>
        </button>
        {linkApp && (
          <a
            href={linkApp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 transition hover:border-emerald-400/40"
          >
            <Icon name="external" size={18} className="shrink-0 text-zinc-400" />
            <span>
              <span className="block text-sm font-semibold text-zinc-100">Ouvir no app do Spotify</span>
              <span className="block text-[11px] text-zinc-400">Conta grátis: completas, com anúncios</span>
            </span>
          </a>
        )}
      </div>
      <p className="text-[11px] text-zinc-500">
        Sem conta, o Spotify libera só as prévias. A conta grátis não pede cartão —{' '}
        <a
          href="https://www.spotify.com/br-pt/signup"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-emerald-400 hover:text-emerald-300"
        >
          criar conta no Spotify
        </a>
        .
      </p>
    </div>
  );
}

/**
 * Trilha do perfil — só com os gêneros que a pessoa escolheu, e fugindo dos
 * hits: uma playlist de descoberta, lançamentos recentes e faixas de artistas
 * fora do topo. A seleção de cada gênero muda todo dia; "Outras descobertas"
 * troca na hora. Quem entra com o Spotify Premium ouve completo aqui dentro;
 * os demais ouvem as prévias do player embutido ou vão ao app do Spotify.
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
  // Fila do player embutido: a lista clicada, tocando em sequência.
  const [fila, setFila] = useState<{ faixas: Faixa[]; i: number } | null>(null);
  // Cada clique (ou avanço da fila) é um pedido novo ao player.
  const [pedidos, setPedidos] = useState(0);
  // Duração do que o player carregou: ~30 s quando o Spotify só libera a prévia.
  const [duracaoNoPlayer, setDuracaoNoPlayer] = useState(0);
  // Troca de aba não refaz a busca: cada gênero/rodada é pedido uma vez.
  const guardadas = useRef(new Map<string, Trilha>());
  const spotify = useSpotify();
  // Premium conectado: toca pelo player da plataforma, completo.
  const aqui = spotify.status === 'pronto';

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
    setFila(null);
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
  const tocando = fila ? fila.faixas[fila.i] : null;
  const proximaDaFila = fila && fila.i < fila.faixas.length - 1 ? fila.faixas[fila.i + 1] : null;
  const tocandoId = aqui ? (spotify.reproducao?.faixa.id ?? null) : (tocando?.id ?? null);
  const linkApp = trilha?.playlist?.url ?? trilha?.listas.find((l) => l.faixas.length)?.faixas[0]?.url ?? null;

  /**
   * Toca a lista a partir da faixa clicada — pelo player da plataforma com
   * Premium; senão, pelo player embutido, que segue sozinho para a próxima.
   */
  const tocarFaixa = (lista: Lista, f: Faixa) => {
    if (aqui) {
      void spotify.tocar({ uris: lista.faixas.map((x) => `spotify:track:${x.id}`), inicio: `spotify:track:${f.id}` });
      return;
    }
    setFila({ faixas: lista.faixas, i: Math.max(0, lista.faixas.indexOf(f)) });
    setDuracaoNoPlayer(0);
    setPedidos((n) => n + 1);
  };
  const avancar = () => {
    if (!proximaDaFila) return;
    setFila((f) => (f ? { ...f, i: f.i + 1 } : f));
    setDuracaoNoPlayer(0);
    setPedidos((n) => n + 1);
  };
  const voltarParaPlaylist = () => {
    setFila(null);
    setDuracaoNoPlayer(0);
    setPedidos((n) => n + 1);
  };

  const embed = tocando
    ? { uri: `spotify:track:${tocando.id}`, tocar: true, titulo: tocando.name }
    : trilha?.playlist
      ? { uri: `spotify:playlist:${trilha.playlist.id}`, tocar: false, titulo: trilha.playlist.name }
      : null;
  // Prévia: o Spotify entregou bem menos que a faixa inteira.
  const tipoDaReproducao =
    tocando && duracaoNoPlayer > 0
      ? (tocando.duracaoMs ? duracaoNoPlayer < tocando.duracaoMs - 5000 : duracaoNoPlayer <= 31_000)
        ? 'previa'
        : 'completa'
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
          <PainelSpotify linkApp={linkApp} />

          {aqui && trilha.playlist ? (
            <div className="card-soft flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-[12rem] flex-1">
                <p className="rotulo-hud">Playlist do dia</p>
                <p className="mt-1 truncate text-sm font-medium text-zinc-50">{trilha.playlist.name}</p>
                <p className="text-xs text-zinc-400">por {trilha.playlist.owner}</p>
              </div>
              <button
                type="button"
                onClick={() => void spotify.tocar({ contexto: `spotify:playlist:${trilha.playlist!.id}` })}
                className={BOTAO_PRIMARIO}
              >
                <Icon name="play" size={13} /> Tocar a playlist
              </button>
              <a href={trilha.playlist.url} target="_blank" rel="noopener noreferrer" className={BOTAO_SECUNDARIO}>
                Abrir no Spotify <Icon name="external" size={13} />
              </a>
            </div>
          ) : !aqui && embed ? (
            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
              <PlayerEmbutido
                pedido={{ uri: embed.uri, tocar: embed.tocar, n: `${embed.uri}#${pedidos}` }}
                titulo={embed.titulo}
                onDuracao={setDuracaoNoPlayer}
                onFim={avancar}
              />
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-zinc-800 px-4 py-3">
                {tocando ? (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                        <span className="text-zinc-200">{tocando.name}</span> · {tocando.artist}
                        {tipoDaReproducao === 'previa' && (
                          <span className="rounded-md border border-clay-500/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-clay-300">
                            Prévia de 30 s
                          </span>
                        )}
                        {tipoDaReproducao === 'completa' && (
                          <span className="rounded-md border border-emerald-400/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                            Completa
                          </span>
                        )}
                      </p>
                      {proximaDaFila && (
                        <p className="mt-1 truncate text-[11px] text-zinc-500">
                          Depois: {proximaDaFila.name} · {proximaDaFila.artist}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {proximaDaFila && (
                        <button
                          type="button"
                          onClick={avancar}
                          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-300 hover:text-emerald-300"
                        >
                          <Icon name="skipNext" size={13} /> Próxima
                        </button>
                      )}
                      {trilha.playlist && (
                        <button type="button" onClick={voltarParaPlaylist} className="text-xs font-medium text-emerald-400 hover:text-emerald-300">
                          Voltar para a playlist
                        </button>
                      )}
                    </div>
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
              tocando={tocandoId}
              onTocar={(f) => tocarFaixa(l, f)}
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
            Reprodução pelo Spotify: sem conta, prévias de 30 s; com conta grátis, completas no app do Spotify, com
            anúncios; com Premium, completas aqui, sem anúncios.
          </p>
        </>
      )}
    </div>
  );
}
