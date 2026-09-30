'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../icons';
import Avatar from '../Avatar';
import { supabase } from '@/lib/supabase';
import { ChamadaMesh, MAX_PESSOAS, servidoresIce, topicoDaChamada, type ModoChamada, type PessoaNaChamada } from '@/lib/chamada';

const CLARO = 'text-[#f6f2ea]';

/** Um quadro: vídeo da pessoa, ou a foto dela quando a câmera está desligada. */
function Quadro({
  stream,
  nome,
  avatarPath,
  eu = false,
  espelhar = false,
  comVideo,
  micLigado,
  falando,
  qualidade,
  aviso,
  encaixe = 'cover',
  compacto = false,
  className = '',
}: {
  stream: MediaStream | null;
  nome: string;
  avatarPath?: string | null;
  eu?: boolean;
  espelhar?: boolean;
  comVideo: boolean;
  micLigado: boolean;
  falando: boolean;
  qualidade?: string | null;
  aviso?: string | null;
  encaixe?: 'cover' | 'contain';
  /** Quadro pequeno, da janela flutuante. */
  compacto?: boolean;
  className?: string;
}) {
  const video = useRef<HTMLVideoElement>(null);
  // Até o primeiro quadro chegar, mostra a foto da pessoa (e não um retângulo vazio).
  const [comImagem, setComImagem] = useState(false);
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (v.srcObject !== stream) v.srcObject = stream;
    setComImagem(v.videoWidth > 0);
    if (stream) v.play().catch(() => undefined);
  }, [stream]);
  const mostrarVideo = comVideo && comImagem;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-[#1b1c20] transition-shadow ${
        falando ? 'shadow-[0_0_0_3px_rgba(106,140,192,0.95)]' : 'shadow-[0_0_0_1px_rgba(255,255,255,0.06)]'
      } ${className}`}
    >
      {/* O <video> fica sempre montado: é ele que toca o áudio da pessoa. */}
      <video
        ref={video}
        autoPlay
        playsInline
        muted={eu}
        onLoadedData={() => setComImagem(true)}
        onResize={() => setComImagem(true)}
        className={`h-full w-full ${encaixe === 'contain' ? 'object-contain' : 'object-cover'} ${espelhar ? '-scale-x-100' : ''} ${
          comVideo ? '' : 'invisible'
        }`}
      />
      {!mostrarVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <Avatar nome={nome} path={avatarPath} tamanho={compacto ? 36 : 88} />
          {comVideo && <span className="h-1.5 w-10 animate-pulse rounded-full bg-white/20" aria-label="carregando o vídeo" />}
        </div>
      )}
      <div className={`absolute flex items-center gap-1.5 ${compacto ? 'inset-x-1 bottom-1 text-[10px]' : 'inset-x-2 bottom-2 text-xs'} ${CLARO}`}>
        <span className={`flex min-w-0 items-center gap-1 rounded-lg bg-black/55 ${compacto ? 'px-1.5 py-0.5' : 'px-2 py-1'}`}>
          {!micLigado && (
            <span role="img" aria-label="microfone desligado" className="shrink-0">
              <Icon name="micOff" size={compacto ? 11 : 13} className="text-[#fca5a5]" />
            </span>
          )}
          <span className="truncate">{eu ? `${nome} (você)` : nome}</span>
        </span>
        {qualidade && !compacto && <span className="ml-auto rounded-lg bg-black/55 px-2 py-1 font-mono text-[10px] opacity-80">{qualidade}</span>}
      </div>
      {aviso && (
        <div className={`absolute rounded-lg bg-black/60 ${compacto ? 'inset-x-1 top-1 px-1.5 py-0.5 text-[10px] leading-tight' : 'inset-x-2 top-2 px-2 py-1 text-[11px]'} ${CLARO}`}>{aviso}</div>
      )}
    </div>
  );
}

function Botao({
  onClick,
  ativo = true,
  perigo = false,
  rotulo,
  icone,
  pequeno = false,
}: {
  onClick: () => void;
  ativo?: boolean;
  perigo?: boolean;
  rotulo: string;
  icone: Parameters<typeof Icon>[0]['name'];
  pequeno?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      title={rotulo}
      aria-pressed={!perigo ? !ativo : undefined}
      className={"action-collage " + (`flex items-center justify-center rounded-full transition ${pequeno ? 'h-9 w-9' : 'h-12 w-12 sm:h-14 sm:w-14'} ${
        perigo ? 'bg-[#dc2626] text-white hover:bg-[#ef4444]' : ativo ? 'bg-white/10 text-[#f6f2ea] hover:bg-white/20' : 'bg-[#f6f2ea] text-[#16181d]'
      }`)}
    >
      <Icon name={icone} size={pequeno ? 17 : 22} />
    </button>
  );
}

const tempo = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Janela flutuante (padrão), recolhida numa barra, ou ampliada na tela toda. */
type Formato = 'janela' | 'recolhida' | 'ampliada';

/**
 * Posição da janela flutuante: arrastada pelo topo, sempre inteira dentro da
 * tela. Começa no canto de baixo à direita; no celular, em cima (embaixo fica o
 * campo de mensagem e a barra de abas).
 */
function useJanelaArrastavel(caixa: React.RefObject<HTMLDivElement>, ativa: boolean) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const arrasto = useRef<{ dx: number; dy: number; id: number } | null>(null);

  const dentroDaTela = useCallback(
    (x: number, y: number) => {
      const el = caixa.current;
      const [w, h, margem] = [el?.offsetWidth ?? 0, el?.offsetHeight ?? 0, 8];
      return {
        x: Math.round(Math.min(Math.max(margem, x), window.innerWidth - w - margem)),
        y: Math.round(Math.min(Math.max(margem, y), window.innerHeight - h - margem)),
      };
    },
    [caixa],
  );

  useLayoutEffect(() => {
    if (!ativa) return;
    const el = caixa.current;
    if (!el) return;
    setPos((p) =>
      p
        ? dentroDaTela(p.x, p.y)
        : dentroDaTela(window.innerWidth - el.offsetWidth - 16, window.innerWidth < 768 ? 76 : window.innerHeight - el.offsetHeight - 16),
    );
    // A janela muda de tamanho (recolher, gente entrando) e a tela gira: segue inteira à vista.
    const ajustar = () => setPos((p) => (p ? dentroDaTela(p.x, p.y) : p));
    window.addEventListener('resize', ajustar);
    const observador = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(ajustar) : null;
    observador?.observe(el);
    return () => {
      window.removeEventListener('resize', ajustar);
      observador?.disconnect();
    };
  }, [ativa, caixa, dentroDaTela]);

  const soltar = (e: React.PointerEvent) => {
    if (arrasto.current?.id === e.pointerId) arrasto.current = null;
  };
  const alca = {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      // Os botões do topo continuam sendo botões.
      if (!pos || (e.target as HTMLElement).closest('button')) return;
      arrasto.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y, id: e.pointerId };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const a = arrasto.current;
      if (a && a.id === e.pointerId) setPos(dentroDaTela(e.clientX - a.dx, e.clientY - a.dy));
    },
    onPointerUp: soltar,
    onPointerCancel: soltar,
  };
  return { pos, alca };
}

/**
 * A chamada. Abre numa janela flutuante pequena, que se arrasta pela tela: o
 * grupo (chat, mural, jogos) continua usável por baixo. Dá para recolher numa
 * barra só com os botões ou ampliar na tela toda. A dois: a outra pessoa grande
 * e você no canto. Em grupo: todo mundo em grade. Sair (ou fechar a página)
 * encerra a sua parte.
 */
export default function Chamada({
  groupId,
  titulo,
  meuId,
  meuNome,
  modo,
  comVideo,
  pessoas,
  onSair,
}: {
  groupId: string;
  titulo: string;
  meuId: string;
  meuNome: string;
  modo: ModoChamada;
  comVideo: boolean;
  /** id → nome e foto, para os quadros sem câmera. */
  pessoas: Record<string, { name: string; avatarPath: string | null }>;
  onSair: () => void;
}) {
  const [fase, setFase] = useState<'entrando' | 'na-chamada' | 'erro'>('entrando');
  const [erro, setErro] = useState('');
  const [, setVersao] = useState(0);
  const [segundos, setSegundos] = useState(0);
  const [variasCameras, setVariasCameras] = useState(false);
  const [formato, setFormato] = useState<Formato>('janela');
  const mesh = useRef<ChamadaMesh | null>(null);
  const tela = useRef<HTMLDivElement>(null);
  const janela = useRef<HTMLDivElement>(null);
  const { pos, alca } = useJanelaArrastavel(janela, formato !== 'ampliada');

  useEffect(() => {
    const sb = supabase;
    if (!sb) {
      setErro('Chamadas precisam do Supabase configurado.');
      setFase('erro');
      return;
    }
    let vivo = true;
    let m: ChamadaMesh | null = null;
    (async () => {
      try {
        const ice = await servidoresIce();
        if (!vivo) return;
        m = new ChamadaMesh(sb, topicoDaChamada(groupId, meuId, modo), { userId: meuId, nome: meuNome }, ice, () => setVersao((v) => v + 1));
        mesh.current = m;
        await m.entrar(comVideo);
        if (!vivo) return;
        setFase('na-chamada');
        const dispositivos = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        setVariasCameras(dispositivos.filter((d) => d.kind === 'videoinput').length > 1);
      } catch (e: any) {
        if (!vivo) return;
        setErro(e?.message || 'Não deu para entrar na chamada.');
        setFase('erro');
        void m?.sair();
      }
    })();
    const aoFechar = () => void m?.sair();
    window.addEventListener('pagehide', aoFechar);
    return () => {
      vivo = false;
      window.removeEventListener('pagehide', aoFechar);
      void m?.sair();
      mesh.current = null;
    };
    // A chamada vive enquanto a tela estiver aberta: não reinicia por props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (fase !== 'na-chamada') return;
    const inicio = Date.now();
    const t = setInterval(() => setSegundos(Math.floor((Date.now() - inicio) / 1000)), 1000);
    return () => clearInterval(t);
  }, [fase]);

  // Esc não fecha a chamada por engano; a tela cheia sai sozinha com Esc.
  const telaCheia = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void tela.current?.requestFullscreen?.().catch(() => undefined);
  }, []);

  const reduzir = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    setFormato('janela');
  };

  const sair = async () => {
    await mesh.current?.sair();
    onSair();
  };

  const m = mesh.current;
  const outros: PessoaNaChamada[] = m?.pessoas() ?? [];
  const nomeDe = (p: PessoaNaChamada) => p.meta?.nome ?? pessoas[p.meta?.userId ?? '']?.name ?? 'Alguém';
  const fotoDe = (p: PessoaNaChamada) => pessoas[p.meta?.userId ?? '']?.avatarPath ?? null;
  const avisoDe = (p: PessoaNaChamada) =>
    p.estado === 'failed'
      ? 'Não conectou: a rede de um dos dois bloqueia a conexão direta.'
      : p.estado === 'new' || p.estado === 'connecting'
        ? 'Conectando…'
        : p.retransmitido
          ? 'Via servidor TURN'
          : null;
  const temVideo = (p: PessoaNaChamada) => Boolean(p.meta?.video && p.stream?.getVideoTracks().length);

  const meuQuadro = (classe: string, encaixe: 'cover' | 'contain' = 'cover', compacto = false) => (
    <Quadro
      stream={m?.local ?? null}
      nome={meuNome}
      avatarPath={pessoas[meuId]?.avatarPath}
      eu
      espelhar={m?.frente === 'user'}
      comVideo={Boolean(m?.video)}
      micLigado={m?.audio ?? true}
      falando={Boolean(m?.meFalando)}
      encaixe={encaixe}
      compacto={compacto}
      className={classe}
    />
  );
  const quadroDe = (p: PessoaNaChamada, classe: string, encaixe: 'cover' | 'contain' = 'cover', compacto = false) => (
    <Quadro
      key={p.sessao}
      stream={p.stream}
      nome={nomeDe(p)}
      avatarPath={fotoDe(p)}
      comVideo={temVideo(p)}
      micLigado={p.meta?.audio ?? true}
      falando={p.falando}
      qualidade={p.qualidade}
      aviso={avisoDe(p)}
      encaixe={encaixe}
      compacto={compacto}
      className={classe}
    />
  );

  const total = outros.length + 1;
  const colunas = total <= 2 ? 'sm:grid-cols-2' : total <= 4 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3';
  const encerrada = fase === 'erro' || Boolean(m?.cheia);
  const status =
    fase === 'entrando' ? 'Entrando…' : fase === 'erro' ? 'Chamada encerrada' : `${tempo(segundos)} · ${total} ${total === 1 ? 'pessoa' : 'pessoas'}`;
  const aguardando =
    fase === 'entrando'
      ? 'Preparando câmera e microfone…'
      : modo.tipo !== 'grupo'
        ? `Chamando ${pessoas[modo.outroId]?.name ?? 'a pessoa'}…`
        : 'Aguardando o grupo entrar…';
  const avisoDeEncerrada = m?.cheia ? `A chamada está cheia (até ${MAX_PESSOAS} pessoas).` : erro;

  const controles = (pequeno: boolean) => (
    <>
      {fase === 'na-chamada' && m && !m.cheia && (
        <>
          <Botao
            onClick={() => m.alternarAudio()}
            ativo={m.audio}
            rotulo={m.audio ? 'Desligar microfone' : 'Ligar microfone'}
            icone={m.audio ? 'mic' : 'micOff'}
            pequeno={pequeno}
          />
          <Botao
            onClick={() => void m.alternarVideo().catch((e) => setErro(e?.message || 'Câmera indisponível.'))}
            ativo={m.video}
            rotulo={m.video ? 'Desligar câmera' : 'Ligar câmera'}
            icone={m.video ? 'video' : 'videoOff'}
            pequeno={pequeno}
          />
          {variasCameras && m.video && <Botao onClick={() => void m.trocarCamera()} rotulo="Trocar câmera" icone="cameraSwitch" pequeno={pequeno} />}
        </>
      )}
      <Botao onClick={() => void sair()} perigo rotulo="Sair da chamada" icone="phoneOff" pequeno={pequeno} />
    </>
  );

  // Direto no <body>: fora de qualquer espaçamento ou empilhamento da página.
  if (formato !== 'ampliada') {
    const recolhida = formato === 'recolhida';
    return createPortal(
      <div
        ref={janela}
        role="region"
        aria-label={`Chamada em andamento: ${titulo}`}
        className={`fixed z-[75] flex w-[13.5rem] flex-col overflow-hidden rounded-2xl bg-[#0b0b0c] shadow-[0_18px_50px_-12px_rgba(0,0,0,0.6)] ring-1 ring-white/10 sm:w-80 ${CLARO}`}
        style={pos ? { left: pos.x, top: pos.y } : { right: 16, bottom: 16 }}
      >
        <div
          {...alca}
          className="flex cursor-grab touch-none select-none items-center gap-2 px-3 py-2 active:cursor-grabbing"
          title="Arraste para mudar a chamada de lugar"
        >
          <span className={`h-2 w-2 shrink-0 rounded-full ${fase === 'erro' ? 'bg-[#dc2626]' : 'animate-pulse bg-[#34d399]'}`} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">{titulo}</p>
            <p className="truncate text-[10px] opacity-70">{status}</p>
          </div>
          <button
            type="button"
            onClick={() => setFormato(recolhida ? 'janela' : 'recolhida')}
            className="rounded-lg p-1.5 opacity-80 hover:bg-white/10"
            aria-label={recolhida ? 'Mostrar os vídeos' : 'Recolher a chamada'}
            title={recolhida ? 'Mostrar os vídeos' : 'Recolher'}
          >
            <Icon name={recolhida ? 'chevronDown' : 'chevronUp'} size={16} />
          </button>
          <button
            type="button"
            onClick={() => setFormato('ampliada')}
            className="rounded-lg p-1.5 opacity-80 hover:bg-white/10"
            aria-label="Ampliar a chamada"
            title="Ampliar"
          >
            <Icon name="maximize" size={16} />
          </button>
        </div>

        {/* Recolhida, os vídeos saem da vista mas seguem montados: é deles que sai o som. */}
        <div className={recolhida && !encerrada ? 'sr-only' : 'px-2'}>
          {encerrada ? (
            <div className="flex flex-col items-center gap-2 px-2 py-3 text-center">
              <p className="text-xs">{avisoDeEncerrada}</p>
              <button onClick={onSair} className="action-collage rounded-lg bg-white/15 px-3 py-1.5 text-xs hover:bg-white/25">
                Fechar
              </button>
            </div>
          ) : outros.length === 0 ? (
            <div className="relative aspect-video">
              {meuQuadro('h-full w-full', 'cover', true)}
              <p className="pointer-events-none absolute inset-x-1.5 top-1.5 rounded-lg bg-black/55 px-2 py-1 text-center text-[10px]">{aguardando}</p>
            </div>
          ) : outros.length === 1 ? (
            <div className="relative aspect-video">
              {quadroDe(outros[0], 'h-full w-full', 'cover', true)}
              <div className="absolute bottom-1.5 right-1.5 aspect-video w-1/3">{meuQuadro('h-full w-full', 'cover', true)}</div>
            </div>
          ) : (
            <div className="grid max-h-[45vh] grid-cols-2 gap-1 overflow-y-auto">
              {meuQuadro('aspect-video w-full', 'cover', true)}
              {outros.map((p) => quadroDe(p, 'aspect-video w-full', 'cover', true))}
            </div>
          )}
        </div>

        {!encerrada && <div className="flex items-center justify-center gap-2 px-3 pb-3 pt-2">{controles(true)}</div>}
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div
      ref={tela}
      className={`fixed inset-0 z-[75] flex flex-col bg-[#0b0b0c] ${CLARO}`}
      role="dialog"
      aria-modal="true"
      aria-label="Chamada"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{titulo}</p>
          <p className="text-[11px] opacity-70">{fase === 'na-chamada' ? `${status} · ponta a ponta, sem servidor de mídia` : status}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={telaCheia} className="action-collage action-collage--paper rounded-xl p-2 opacity-80 hover:bg-white/10" aria-label="Tela cheia" title="Tela cheia">
            <Icon name="maximize" size={18} />
          </button>
          <button onClick={reduzir} className="action-collage action-collage--paper rounded-xl p-2 opacity-80 hover:bg-white/10" aria-label="Reduzir a chamada" title="Reduzir (volta para a janela)">
            <Icon name="minimize" size={18} />
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 px-3 pb-3">
        {encerrada ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Icon name="alert" size={28} className="opacity-70" />
            <p className="max-w-sm text-sm">{avisoDeEncerrada}</p>
            <button onClick={onSair} className="action-collage rounded-xl bg-white/15 px-4 py-2 text-sm hover:bg-white/25">
              Fechar
            </button>
          </div>
        ) : outros.length === 0 ? (
          <div className="relative h-full">
            {meuQuadro('h-full w-full')}
            <div className="pointer-events-none absolute inset-x-0 top-1/3 flex flex-col items-center gap-2 text-center">
              <span className="h-3 w-3 animate-ping rounded-full bg-[#6a8cc0]" />
              <p className="rounded-xl bg-black/50 px-3 py-1.5 text-sm">{aguardando}</p>
            </div>
          </div>
        ) : outros.length === 1 ? (
          <div className="relative h-full">
            {quadroDe(outros[0], 'h-full w-full', 'contain')}
            {/* Você no canto (o quadro é relative; quem posiciona é o invólucro). */}
            <div className="absolute bottom-3 right-3 aspect-[3/4] w-28 sm:aspect-video sm:w-56">{meuQuadro('h-full w-full')}</div>
          </div>
        ) : (
          <div className={`grid h-full auto-rows-fr grid-cols-1 gap-2 ${colunas}`}>
            {meuQuadro('h-full min-h-0 w-full')}
            {outros.map((p) => quadroDe(p, 'h-full min-h-0 w-full'))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 px-4 pb-4 pt-1 sm:gap-4">{controles(false)}</div>
    </div>,
    document.body,
  );
}

/**
 * Quem está na chamada do grupo agora — sem entrar nela (assiste à presença do
 * canal privado sem se anunciar). Desligado enquanto a própria pessoa está na
 * chamada: um tópico, um canal por cliente.
 */
export function usePresencaDaChamada(groupId: string, ligado: boolean) {
  const [presentes, setPresentes] = useState<{ userId: string; nome: string }[]>([]);
  useEffect(() => {
    const sb = supabase;
    if (!sb || !ligado) {
      setPresentes([]);
      return;
    }
    let vivo = true;
    let canal: ReturnType<typeof sb.channel> | null = null;
    (async () => {
      await sb.realtime.setAuth().catch(() => undefined);
      if (!vivo) return;
      canal = sb.channel(`grupo:${groupId}:chamada`, { config: { private: true } });
      canal
        .on('presence', { event: 'sync' }, () => {
          const estado = canal!.presenceState() as Record<string, { userId?: string; nome?: string }[]>;
          const porPessoa = new Map<string, string>();
          for (const metas of Object.values(estado)) {
            const m = metas[metas.length - 1];
            if (m?.userId) porPessoa.set(m.userId, m.nome ?? 'Alguém');
          }
          setPresentes(Array.from(porPessoa.entries()).map(([userId, nome]) => ({ userId, nome })));
        })
        .subscribe();
    })();
    return () => {
      vivo = false;
      if (canal) void sb.removeChannel(canal);
    };
  }, [groupId, ligado]);
  return presentes;
}
