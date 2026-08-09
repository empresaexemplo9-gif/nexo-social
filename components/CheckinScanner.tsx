'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Icon from './icons';

// Validação de ingresso na porta do evento.
//
// A leitura usa a BarcodeDetector, que já vem no Chrome do Android e no
// Edge/Chrome de desktop. No Safari do iPhone ela não existe, e não vale trazer
// um decodificador inteiro em JavaScript para a portaria: quando a câmera não
// dá, o campo de digitação resolve — o código também está impresso embaixo do
// QR justamente para isso.

interface Resultado {
  ok: boolean;
  motivo?: string;
  holder?: string;
  code: string;
  em: number;
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => {
      detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
    };
  }
}

/** Espaço entre leituras do mesmo código, para não validar duas vezes no susto. */
const DEBOUNCE_MS = 3000;

export default function CheckinScanner() {
  const [codigo, setCodigo] = useState('');
  const [historico, setHistorico] = useState<Resultado[]>([]);
  const [camera, setCamera] = useState(false);
  const [suportaCamera, setSuportaCamera] = useState(false);
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ultimo = useRef<{ code: string; em: number }>({ code: '', em: 0 });

  useEffect(() => {
    setSuportaCamera(typeof window !== 'undefined' && Boolean(window.BarcodeDetector) && Boolean(navigator.mediaDevices));
  }, []);

  const validar = useCallback(async (code: string) => {
    const limpo = code.trim().toUpperCase();
    if (!limpo) return;

    // Mesmo código lido de novo em segundos: a segunda leitura só devolveria
    // "já utilizado" e assustaria quem está na porta.
    const agora = Date.now();
    if (ultimo.current.code === limpo && agora - ultimo.current.em < DEBOUNCE_MS) return;
    ultimo.current = { code: limpo, em: agora };

    setEnviando(true);
    try {
      const res = await fetch('/api/ingressos/validar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: limpo }),
      });
      const d = await res.json();
      setHistorico((h) => [{ ok: Boolean(d?.ok), motivo: d?.motivo ?? d?.error, holder: d?.holder, code: limpo, em: agora }, ...h].slice(0, 25));
      if (navigator.vibrate) navigator.vibrate(d?.ok ? 60 : [60, 60, 60]);
    } catch {
      setHistorico((h) => [{ ok: false, motivo: 'Falha de conexão.', code: limpo, em: agora }, ...h].slice(0, 25));
    } finally {
      setEnviando(false);
      setCodigo('');
    }
  }, []);

  const pararCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamera(false);
  }, []);

  useEffect(() => pararCamera, [pararCamera]);

  async function ligarCamera() {
    setAviso('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      setCamera(true);
      // O <video> só existe depois do render; esperar um quadro evita o null.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => undefined);
        }
      });
      lerContinuamente();
    } catch {
      setAviso('Não foi possível abrir a câmera. Digite o código do ingresso.');
    }
  }

  async function lerContinuamente() {
    if (!window.BarcodeDetector) return;
    const detector = new window.BarcodeDetector({ formats: ['qr_code'] });

    const quadro = async () => {
      if (!streamRef.current || !videoRef.current) return;
      try {
        const achados = await detector.detect(videoRef.current);
        if (achados.length) await validar(achados[0].rawValue);
      } catch {
        // Quadro ruim (foco, luz): a próxima passada tenta de novo.
      }
      if (streamRef.current) requestAnimationFrame(quadro);
    };
    requestAnimationFrame(quadro);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        {camera ? (
          <div className="space-y-3">
            <video
              ref={videoRef}
              playsInline
              muted
              className="mx-auto aspect-square w-full max-w-sm rounded-xl bg-black object-cover"
            />
            <button
              type="button"
              onClick={pararCamera}
              className="w-full rounded-xl border border-zinc-700 py-2.5 text-sm font-semibold text-zinc-200"
            >
              Parar câmera
            </button>
          </div>
        ) : (
          suportaCamera && (
            <button
              type="button"
              onClick={ligarCamera}
              className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
            >
              <Icon name="video" size={16} /> Ler QR com a câmera
            </button>
          )
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            validar(codigo);
          }}
          className={`flex gap-2 ${camera || suportaCamera ? 'mt-3' : ''}`}
        >
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Digite o código do ingresso"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 font-mono text-sm uppercase text-zinc-100 outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={enviando || !codigo.trim()}
            className="shrink-0 rounded-xl bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-zinc-900 disabled:opacity-50"
          >
            Validar
          </button>
        </form>

        {!suportaCamera && (
          <p className="mt-2 text-xs text-zinc-500">
            Este navegador não lê QR pela câmera. Use o código impresso abaixo do QR do ingresso.
          </p>
        )}
        {aviso && <p className="mt-2 text-sm text-clay-300">{aviso}</p>}
      </div>

      {historico.length > 0 && (
        <ul className="space-y-2">
          {historico.map((r, i) => (
            <li
              key={`${r.code}-${r.em}-${i}`}
              className={`flex items-center gap-3 rounded-xl border p-3 ${
                r.ok ? 'border-emerald-700 bg-emerald-950/30' : 'border-red-900 bg-red-950/20'
              }`}
            >
              <span className="text-xl">{r.ok ? '✅' : '⛔'}</span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${r.ok ? 'text-emerald-300' : 'text-red-400'}`}>
                  {r.ok ? `Entrada liberada${r.holder ? ` — ${r.holder}` : ''}` : (r.motivo ?? 'Ingresso recusado')}
                </p>
                <p className="font-mono text-xs text-zinc-500">{r.code}</p>
              </div>
              <span className="shrink-0 text-xs text-zinc-500">
                {new Date(r.em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
