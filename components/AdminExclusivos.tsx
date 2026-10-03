'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { NOME_DO_TIPO, TIPOS_EXCLUSIVOS, fatiar, porTema, type ItemExclusivo, type TipoExclusivo } from '@/lib/exclusivos';
import { recortarAdesivos, recortarBottons, recortarEmGrade, type Peca } from '@/lib/recorte';

type Item = ItemExclusivo & { active: boolean; sorteavel?: boolean };
type Pessoa = { id: string; full_name: string | null; email: string | null };
type Concessao = { asset_id: string; user_id: string };

/** Como a imagem enviada vira itens: inteira, folha recortada sozinha, folha em grade ou cartela de bottons. */
type Modo = 'inteira' | 'folha' | 'grade' | 'cartela';

interface Recorte {
  id: string;
  nome: string;
  blob: Blob;
  previa: string;
  /** Miniatura (planos de fundo). */
  mini?: Blob;
  usar: boolean;
}

const LADO = { sticker: 512, button: 400, wallpaper: 1920 } as const;

/** A imagem do arquivo em pixels (até 2400 px de lado, para o recorte não pesar). */
async function lerPixels(file: File) {
  const bmp = await createImageBitmap(file);
  const f = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
  const W = Math.round(bmp.width * f);
  const H = Math.round(bmp.height * f);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0, W, H);
  bmp.close();
  return { canvas, W, H, px: ctx.getImageData(0, 0, W, H).data };
}

/** Canvas → arquivo (WEBP quando o navegador sabe gravar; senão, PNG). */
function paraBlob(canvas: HTMLCanvasElement, qualidade = 0.85): Promise<Blob> {
  return new Promise((ok, erro) =>
    canvas.toBlob((b) => {
      if (b && b.type === 'image/webp') return ok(b);
      canvas.toBlob((p) => (p ? ok(p) : erro(new Error('Não foi possível gerar a imagem.'))), 'image/png');
    }, 'image/webp', qualidade),
  );
}

/** Reduz para caber em `lado` × `lado`. */
function reduzir(fonte: HTMLCanvasElement, lado: number) {
  const f = Math.min(1, lado / Math.max(fonte.width, fonte.height));
  if (f === 1) return fonte;
  const c = document.createElement('canvas');
  c.width = Math.round(fonte.width * f);
  c.height = Math.round(fonte.height * f);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(fonte, 0, 0, c.width, c.height);
  return c;
}

/** Uma peça recortada da folha, com a transparência do contorno. */
function pecaEmCanvas(folha: HTMLCanvasElement, p: Peca) {
  const c = document.createElement('canvas');
  c.width = p.w;
  c.height = p.h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(folha, -p.x, -p.y);
  const img = ctx.getImageData(0, 0, p.w, p.h);
  for (let i = 0; i < p.w * p.h; i++) img.data[i * 4 + 3] = Math.min(img.data[i * 4 + 3], p.alfa[i]);
  ctx.putImageData(img, 0, 0);
  return c;
}

const extensao = (b: Blob) => (b.type === 'image/webp' ? 'webp' : 'png');

export default function AdminExclusivos({ demo = false }: { demo?: boolean }) {
  const [itens, setItens] = useState<Item[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [concessoes, setConcessoes] = useState<Concessao[]>([]);
  const [kit, setKit] = useState<Set<string>>(new Set());
  const [destino, setDestino] = useState<Set<string>>(new Set());
  const [tema, setTema] = useState<string>('');
  const [tipo, setTipo] = useState<TipoExclusivo | ''>('');
  const [buscaPessoa, setBuscaPessoa] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [carregado, setCarregado] = useState(false);
  // Ocultar e apagar ficam num modo à parte: na montagem, um toque só põe ou tira do kit.
  const [gerenciar, setGerenciar] = useState(false);
  const painelDoKit = useRef<HTMLElement>(null);
  const [painelVisivel, setPainelVisivel] = useState(false);

  // Enviar itens novos à coleção.
  const [novoTipo, setNovoTipo] = useState<TipoExclusivo>('sticker');
  const [novoTema, setNovoTema] = useState('');
  const [novaEdicao, setNovaEdicao] = useState('');
  const [modo, setModo] = useState<Modo>('folha');
  const [linhas, setLinhas] = useState(2);
  const [colunas, setColunas] = useState(3);
  const [quantidade, setQuantidade] = useState(0);
  const [recortes, setRecortes] = useState<Recorte[]>([]);
  const arquivo = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    if (demo) return setCarregado(true);
    const r = await fetch('/api/admin/exclusivos', { cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    setCarregado(true);
    if (!r.ok) return setMensagem(`❌ ${j.error || 'Não foi possível carregar os itens exclusivos.'}`);
    setItens(j.assets ?? []);
    setPessoas(j.users ?? []);
    setConcessoes(j.grants ?? []);
  }, [demo]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // No celular o kit fica abaixo da coleção: a barra flutuante some quando ele aparece.
  useEffect(() => {
    const el = painelDoKit.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(([e]) => setPainelVisivel(e.isIntersecting), { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // As prévias são URLs de objeto: libera ao trocar.
  useEffect(() => () => recortes.forEach((r) => URL.revokeObjectURL(r.previa)), [recortes]);

  const temas = useMemo(() => porTema(itens), [itens]);
  const nomesDosTemas = temas.map((t) => t.tema);
  const edicoesDoTema = useMemo(
    () => Array.from(new Set(itens.filter((i) => i.collection === novoTema).map((i) => i.edition).filter(Boolean))),
    [itens, novoTema],
  );
  const quemTem = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const g of concessoes) {
      const s = m.get(g.asset_id) ?? new Set<string>();
      s.add(g.user_id);
      m.set(g.asset_id, s);
    }
    return m;
  }, [concessoes]);

  const visiveis = temas.filter((t) => !tema || t.tema === tema);
  const noKit = itens.filter((i) => kit.has(i.id));
  const pessoasFiltradas = pessoas.filter((p) => {
    const q = buscaPessoa.trim().toLowerCase();
    return !q || (p.full_name ?? '').toLowerCase().includes(q) || (p.email ?? '').toLowerCase().includes(q);
  });

  const alternar = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, ids: string[], ligar?: boolean) =>
    setter((velho) => {
      const novo = new Set(velho);
      const todos = ids.every((id) => novo.has(id));
      const quer = ligar ?? !todos;
      ids.forEach((id) => (quer ? novo.add(id) : novo.delete(id)));
      return novo;
    });

  const postar = async (corpo: Record<string, unknown>) => {
    const r = await fetch('/api/admin/exclusivos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Falha ao salvar.');
    return j;
  };

  const enviarKit = async (acao: 'grant' | 'revoke') => {
    if (!kit.size || !destino.size) return setMensagem('Monte o kit e escolha pelo menos uma pessoa.');
    if (acao === 'revoke' && !window.confirm('Tirar estes itens das pessoas selecionadas?')) return;
    setOcupado(true);
    try {
      await postar({ action: acao, assetIds: Array.from(kit), userIds: Array.from(destino) });
      setMensagem(
        acao === 'grant'
          ? `✓ Kit enviado: ${kit.size} ${kit.size === 1 ? 'item' : 'itens'} para ${destino.size} ${destino.size === 1 ? 'pessoa' : 'pessoas'}. É delas, sem prazo.`
          : '✓ Itens retirados das pessoas selecionadas.',
      );
      await carregar();
    } catch (e) {
      setMensagem(`❌ ${(e as Error).message}`);
    } finally {
      setOcupado(false);
    }
  };

  const mudarItem = async (item: Item, mudanca: Record<string, unknown>) => {
    setOcupado(true);
    try {
      await postar({ action: 'update', assetId: item.id, ...mudanca });
      await carregar();
    } catch (e) {
      setMensagem(`❌ ${(e as Error).message}`);
    } finally {
      setOcupado(false);
    }
  };

  const apagar = async (item: Item) => {
    if (!window.confirm(`Apagar “${item.title}” da coleção? Quem recebeu perde o item.`)) return;
    setOcupado(true);
    try {
      await postar({ action: 'delete', assetId: item.id });
      setKit((s) => {
        const n = new Set(s);
        n.delete(item.id);
        return n;
      });
      await carregar();
    } catch (e) {
      setMensagem(`❌ ${(e as Error).message}`);
    } finally {
      setOcupado(false);
    }
  };

  /** Lê os arquivos e prepara os itens (recortando as folhas e cartelas). */
  const preparar = async (files: File[]) => {
    if (!files.length) return;
    setOcupado(true);
    setMensagem('');
    recortes.forEach((r) => URL.revokeObjectURL(r.previa));
    try {
      const novos: Recorte[] = [];
      for (const file of files) {
        const { canvas, W, H, px } = await lerPixels(file);
        let partes: HTMLCanvasElement[];
        if (novoTipo === 'wallpaper' || modo === 'inteira') partes = [canvas];
        else {
          const pecas =
            modo === 'grade'
              ? recortarEmGrade(px, W, H, linhas, colunas)
              : modo === 'cartela'
                ? recortarBottons(px, W, H, { quantidade: quantidade || undefined })
                : recortarAdesivos(px, W, H);
          // Uma peça do tamanho da folha inteira: o fundo não foi achado (melhor avisar que devolver a folha).
          if (modo === 'folha' && pecas.length === 1 && pecas[0].w * pecas[0].h >= W * H * 0.97) {
            throw new Error(`Não consegui separar o fundo de ${file.name}. Tente “Folha em grade” (linhas × colunas) ou “Imagens soltas”.`);
          }
          partes = pecas.map((p) => pecaEmCanvas(canvas, p));
          if (!partes.length) throw new Error(`Não achei peças em ${file.name}. Tente “Folha em grade” ou “Imagens soltas”.`);
        }
        for (const parte of partes) {
          const blob = await paraBlob(reduzir(parte, LADO[novoTipo]), novoTipo === 'wallpaper' ? 0.8 : 0.85);
          const mini = novoTipo === 'wallpaper' ? await paraBlob(reduzir(parte, 560), 0.72) : undefined;
          const n = novos.length + 1;
          novos.push({
            id: `${Date.now()}-${n}`,
            nome: files.length === 1 && partes.length === 1 && novaEdicao ? novaEdicao : `${novaEdicao || NOME_DO_TIPO[novoTipo].um} ${String(n).padStart(2, '0')}`,
            blob,
            mini,
            previa: URL.createObjectURL(blob),
            usar: true,
          });
        }
      }
      setRecortes(novos);
      setMensagem(`${novos.length} ${novos.length === 1 ? 'item pronto' : 'itens prontos'} — confira, dê nome e salve na coleção.`);
    } catch (e) {
      setMensagem(`❌ ${(e as Error).message}`);
    } finally {
      setOcupado(false);
    }
  };

  /** Sobe os itens prontos para o bucket (tema/tipo/…) e cadastra na coleção. */
  const salvarNaColecao = async () => {
    if (demo) return setMensagem('Modo demonstração: configure o Supabase para enviar itens.');
    if (!supabase) return setMensagem('❌ Supabase indisponível.');
    const escolhidos = recortes.filter((r) => r.usar);
    if (!escolhidos.length) return setMensagem('Nenhum item marcado para salvar.');
    if (!novoTema.trim()) return setMensagem('Diga o tema ou a banda.');
    setOcupado(true);
    const criados: string[] = [];
    let ordem = Math.max(0, ...itens.map((a) => Number(a.sortOrder) || 0)) + 1;
    const pasta = `${fatiar(novoTema)}/${NOME_DO_TIPO[novoTipo].pasta}`;
    const base = `${fatiar(novaEdicao || NOME_DO_TIPO[novoTipo].um)}-${Date.now()}`;
    try {
      for (let i = 0; i < escolhidos.length; i++) {
        const r = escolhidos[i];
        const caminho = `${pasta}/${base}-${String(i + 1).padStart(2, '0')}.${extensao(r.blob)}`;
        const up = await supabase.storage.from('exclusivos').upload(caminho, r.blob, { contentType: r.blob.type, upsert: false });
        if (up.error) throw new Error(`Falha ao enviar “${r.nome}”: ${up.error.message}`);
        let miniatura: string | null = null;
        if (r.mini) {
          miniatura = caminho.replace(/\.(webp|png)$/, `-mini.${extensao(r.mini)}`);
          const m = await supabase.storage.from('exclusivos').upload(miniatura, r.mini, { contentType: r.mini.type, upsert: false });
          if (m.error) miniatura = null;
        }
        try {
          const j = await postar({
            action: 'create',
            title: r.nome.trim() || `Item ${ordem}`,
            kind: novoTipo,
            collection: novoTema,
            edition: novaEdicao,
            imagePath: caminho,
            thumbPath: miniatura,
            sortOrder: ordem++,
          });
          criados.push(j.asset.id);
        } catch (e) {
          await supabase.storage.from('exclusivos').remove([caminho, ...(miniatura ? [miniatura] : [])]);
          throw e;
        }
      }
      setRecortes([]);
      if (arquivo.current) arquivo.current.value = '';
      setMensagem(`✓ ${criados.length} ${criados.length === 1 ? 'item salvo' : 'itens salvos'} em ${novoTema} → ${NOME_DO_TIPO[novoTipo].varios}. Já estão no kit em montagem.`);
      await carregar();
      setTema(novoTema.trim());
      setKit((s) => new Set([...Array.from(s), ...criados]));
    } catch (e) {
      setMensagem(`❌ ${(e as Error).message}`);
    } finally {
      setOcupado(false);
    }
  };

  const contaPorTipo = (lista: Item[]) => TIPOS_EXCLUSIVOS.map((k) => [k, lista.filter((i) => i.kind === k).length] as const).filter(([, n]) => n);
  const campo = 'mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100';

  return (
    <div className="space-y-6">
      {mensagem && (
        <div role="status" className="rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-sm text-zinc-200">
          {mensagem}
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        {/* --- A coleção: tema/banda → tipo → edição ------------------------------------- */}
        <section className="min-w-0 space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-zinc-50">Coleção de exclusivos</h2>
              <p className="mt-0.5 text-xs text-zinc-400">
                Planos de fundo, adesivos e bottons, cada tema/banda no seu espaço. Toque nos itens para montar o kit; depois escolha quem recebe.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-zinc-500">{itens.length} itens</span>
              <button type="button" onClick={() => setGerenciar((v) => !v)} aria-pressed={gerenciar} className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${gerenciar ? 'border-zinc-50 bg-zinc-50 text-zinc-950' : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'}`}>
                {gerenciar ? 'Pronto' : 'Gerenciar coleção'}
              </button>
            </div>
          </div>
          {gerenciar && (
            <p className="rounded-lg border border-amber-800/50 bg-amber-950/30 px-3 py-2 text-[11px] text-amber-300">
              Modo de gerenciar: embaixo de cada item, tire do sorteio das missões (fica só para os kits), oculte ou apague. Toque em Pronto para voltar a montar o kit.
            </p>
          )}

          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Tema ou banda">
            <button type="button" role="tab" aria-selected={!tema} onClick={() => setTema('')} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${!tema ? 'border-emerald-400 bg-emerald-400 text-zinc-950' : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'}`}>
              Todos
            </button>
            {temas.map((t) => {
              const n = t.tipos.reduce((a, k) => a + k.edicoes.reduce((b, e) => b + e.itens.length, 0), 0);
              return (
                <button key={t.tema} type="button" role="tab" aria-selected={tema === t.tema} onClick={() => setTema(t.tema)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${tema === t.tema ? 'border-emerald-400 bg-emerald-400 text-zinc-950' : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'}`}>
                  {t.tema} <span className="opacity-60">{n}</span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Tipo">
            {(['', ...TIPOS_EXCLUSIVOS] as const).map((k) => (
              <button key={k || 'todos'} type="button" role="tab" aria-selected={tipo === k} onClick={() => setTipo(k)} className={`rounded-lg px-3 py-1 text-xs font-semibold ${tipo === k ? 'bg-zinc-50 text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'}`}>
                {k ? NOME_DO_TIPO[k].varios : 'Todos os tipos'}
              </button>
            ))}
          </div>

          {!carregado && <p className="py-8 text-center text-sm text-zinc-500">Carregando a coleção…</p>}
          {carregado && !itens.length && <p className="py-8 text-center text-sm text-zinc-500">Nenhum item na coleção ainda.</p>}

          <div className="max-h-[46rem] space-y-6 overflow-y-auto pr-1">
            {visiveis.map((t) => (
              <article key={t.tema} className="space-y-4">
                <h3 className="sticky top-0 z-10 -mx-1 bg-zinc-900/95 px-1 py-1.5 font-display text-xl font-bold text-zinc-50 backdrop-blur">{t.tema}</h3>
                {t.tipos
                  .filter((k) => !tipo || k.tipo === tipo)
                  .map((k) => (
                    <div key={k.tipo} className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-400">{NOME_DO_TIPO[k.tipo].varios}</p>
                      {k.edicoes.map((e) => {
                        const ids = e.itens.map((i) => i.id);
                        const todos = ids.every((id) => kit.has(id));
                        return (
                          <div key={e.edicao || '—'} className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-zinc-300">
                                {e.edicao || 'Sem edição'} <span className="text-zinc-500">· {e.itens.length}</span>
                              </p>
                              <button type="button" onClick={() => alternar(setKit, ids)} className="text-[11px] font-semibold text-emerald-400 hover:underline">
                                {todos ? 'Tirar do kit' : 'Pôr tudo no kit'}
                              </button>
                            </div>
                            <div className={`grid gap-2 ${k.tipo === 'wallpaper' ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-3 sm:grid-cols-5 lg:grid-cols-6'}`}>
                              {(e.itens as Item[]).map((i) => {
                                const no = kit.has(i.id);
                                const n = quemTem.get(i.id)?.size ?? 0;
                                return (
                                  <div key={i.id} className={i.active ? '' : 'opacity-50'}>
                                    <button
                                      type="button"
                                      onClick={() => alternar(setKit, [i.id])}
                                      aria-pressed={no}
                                      aria-label={`${i.title}${no ? ' — no kit' : ''}`}
                                      title={no ? 'Tirar do kit' : 'Pôr no kit'}
                                      className="kit-peca relative block w-full touch-manipulation select-none rounded-xl border border-zinc-800 bg-zinc-950 p-1.5 text-left"
                                    >
                                      <span aria-hidden="true" className="kit-marca">{no ? '✓' : ''}</span>
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={i.thumbUrl} alt="" loading="lazy" draggable={false} className={`pointer-events-none w-full ${k.tipo === 'wallpaper' ? 'aspect-video rounded-lg object-cover' : 'aspect-square object-contain'} ${k.tipo === 'button' ? 'rounded-full' : ''}`} />
                                      <span className="mt-1 block truncate text-[11px] font-semibold text-zinc-100">{i.title}</span>
                                      <span className="block text-[10px] text-zinc-500">{n ? `${n} ${n === 1 ? 'pessoa tem' : 'pessoas têm'}` : 'ninguém tem'}</span>
                                    </button>
                                    {i.sorteavel === false && <span className="mt-1 block text-center text-[10px] font-semibold text-amber-300">fora do sorteio</span>}
                                    {gerenciar && (
                                      <span className="mt-1 grid grid-cols-2 gap-1">
                                        <button type="button" disabled={ocupado} onClick={() => void mudarItem(i, { sorteavel: i.sorteavel === false })} className="col-span-2 rounded-md border border-zinc-700 px-1 py-1 text-[10px] font-semibold text-zinc-200" title={i.sorteavel === false ? 'Volta a sair nas missões' : 'Só sai nos kits que você envia'}>
                                          {i.sorteavel === false ? 'Pôr no sorteio' : 'Tirar do sorteio'}
                                        </button>
                                        <button type="button" disabled={ocupado} onClick={() => void mudarItem(i, { active: !i.active })} className="rounded-md border border-zinc-700 px-1 py-1 text-[10px] font-semibold text-zinc-200" title={i.active ? 'Esconder de quem tem (sem tirar)' : 'Mostrar de novo'}>
                                          {i.active ? 'Ocultar' : 'Mostrar'}
                                        </button>
                                        <button type="button" disabled={ocupado} onClick={() => void apagar(i)} className="rounded-md border border-red-900 px-1 py-1 text-[10px] font-semibold text-red-300">
                                          Apagar
                                        </button>
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
              </article>
            ))}
          </div>
        </section>

        {/* --- O kit e quem recebe ---------------------------------------------------------- */}
        <aside ref={painelDoKit} id="kit-em-montagem" className="scroll-mt-4 space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 xl:sticky xl:top-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-zinc-50">Kit em montagem</h3>
              {kit.size > 0 && (
                <button type="button" onClick={() => setKit(new Set())} className="text-[11px] text-zinc-400 hover:text-zinc-100">
                  Limpar
                </button>
              )}
            </div>
            {noKit.length ? (
              <>
                <p className="mt-1 text-xs text-zinc-400">{contaPorTipo(noKit).map(([k, n]) => `${n} ${n === 1 ? NOME_DO_TIPO[k].um.toLowerCase() : NOME_DO_TIPO[k].varios.toLowerCase()}`).join(' · ')}</p>
                <div className="mt-2 flex max-h-32 flex-wrap gap-1 overflow-y-auto">
                  {noKit.map((i) => (
                    <button key={i.id} type="button" onClick={() => alternar(setKit, [i.id], false)} title={`${i.title} — tirar do kit`} className="h-11 w-11 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={i.thumbUrl} alt="" className={`h-full w-full ${i.kind === 'wallpaper' ? 'object-cover' : 'object-contain'}`} />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-1 text-xs text-zinc-500">Toque nos itens da coleção para montar o kit — de um tema só ou misturando.</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-zinc-50">Quem recebe</h3>
              <button type="button" onClick={() => alternar(setDestino, pessoasFiltradas.map((p) => p.id))} className="text-[11px] font-semibold text-emerald-400 hover:underline">
                {pessoasFiltradas.length && pessoasFiltradas.every((p) => destino.has(p.id)) ? 'Desmarcar' : 'Marcar'} {buscaPessoa ? 'os achados' : 'todos'}
              </button>
            </div>
            <input value={buscaPessoa} onChange={(e) => setBuscaPessoa(e.target.value)} placeholder="Buscar por nome ou e-mail" className={campo} />
            <div className="mt-2 max-h-72 space-y-0.5 overflow-y-auto pr-1">
              {pessoasFiltradas.map((p) => {
                const tem = noKit.filter((i) => quemTem.get(i.id)?.has(p.id)).length;
                return (
                  <label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-zinc-800">
                    <input type="checkbox" checked={destino.has(p.id)} onChange={() => alternar(setDestino, [p.id])} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-zinc-100">{p.full_name || p.email || 'Pessoa'}</span>
                      {p.email && <span className="block truncate text-[11px] text-zinc-500">{p.email}</span>}
                    </span>
                    {noKit.length > 0 && tem > 0 && (
                      <span className="shrink-0 text-[10px] text-zinc-400">
                        já tem {tem}/{noKit.length}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={ocupado || !kit.size || !destino.size} onClick={() => void enviarKit('grant')} className="rounded-xl bg-emerald-400 px-3 py-2.5 text-sm font-bold text-zinc-950 disabled:opacity-50">
              Enviar kit
            </button>
            <button type="button" disabled={ocupado || !kit.size || !destino.size} onClick={() => void enviarKit('revoke')} className="rounded-xl border border-red-800 bg-red-950/30 px-3 py-2.5 text-sm font-semibold text-red-200 disabled:opacity-50">
              Tirar
            </button>
          </div>
          <p className="text-[11px] text-zinc-500">O que a pessoa ganha não expira: fica com ela até você tirar.</p>
        </aside>
      </div>

      {/* No celular e no tablet o kit fica embaixo da coleção: a barra mostra o que já entrou e leva até ele. */}
      {kit.size > 0 && !painelVisivel && (
        <div className="kit-barra fixed inset-x-3 z-40 mx-auto max-w-lg xl:hidden">
          <button
            type="button"
            onClick={() => painelDoKit.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="flex w-full items-center justify-between gap-3 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-zinc-950 shadow-2xl"
          >
            <span>🎁 {kit.size} {kit.size === 1 ? 'item' : 'itens'} no kit</span>
            <span>Escolher quem recebe ↓</span>
          </button>
        </div>
      )}

      {/* --- Pôr itens novos na coleção ------------------------------------------------------- */}
      <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div>
          <h2 className="text-lg font-bold text-zinc-50">Adicionar à coleção</h2>
          <p className="mt-0.5 text-xs text-zinc-400">
            Mande a imagem como veio: a folha de adesivos e a cartela de bottons são recortadas sozinhas, cada peça com o contorno. Confira antes de salvar.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-xs text-zinc-400">
            Tipo
            <select
              value={novoTipo}
              onChange={(e) => {
                const k = e.target.value as TipoExclusivo;
                setNovoTipo(k);
                setModo(k === 'wallpaper' ? 'inteira' : k === 'button' ? 'cartela' : 'folha');
                setRecortes([]);
              }}
              className={campo}
            >
              {TIPOS_EXCLUSIVOS.map((k) => (
                <option key={k} value={k}>
                  {NOME_DO_TIPO[k].varios}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-zinc-400">
            Tema ou banda
            <input value={novoTema} onChange={(e) => setNovoTema(e.target.value)} list="temas-exclusivos" placeholder="ex.: Linkin Park" className={campo} />
            <datalist id="temas-exclusivos">
              {nomesDosTemas.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>
          <label className="text-xs text-zinc-400">
            Edição (opcional)
            <input value={novaEdicao} onChange={(e) => setNovaEdicao(e.target.value)} list="edicoes-exclusivas" placeholder="ex.: Edição especial" className={campo} />
            <datalist id="edicoes-exclusivas">
              {edicoesDoTema.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>
        </div>

        {novoTipo !== 'wallpaper' && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Como recortar">
              {(novoTipo === 'button'
                ? ([['cartela', 'Cartela (recorta sozinho)'], ['inteira', 'Imagens soltas']] as const)
                : ([['folha', 'Folha (recorta sozinho)'], ['grade', 'Folha em grade'], ['inteira', 'Imagens soltas']] as const)
              ).map(([m, rotulo]) => (
                <button key={m} type="button" role="radio" aria-checked={modo === m} onClick={() => setModo(m)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${modo === m ? 'border-emerald-400 bg-emerald-400 text-zinc-950' : 'border-zinc-700 text-zinc-300'}`}>
                  {rotulo}
                </button>
              ))}
            </div>
            {modo === 'grade' && (
              <span className="flex items-center gap-2 text-xs text-zinc-400">
                <input type="number" min={1} max={8} value={linhas} onChange={(e) => setLinhas(Math.max(1, Math.min(8, Number(e.target.value) || 1)))} className="w-16 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-100" aria-label="Linhas" />
                linhas ×
                <input type="number" min={1} max={8} value={colunas} onChange={(e) => setColunas(Math.max(1, Math.min(8, Number(e.target.value) || 1)))} className="w-16 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-100" aria-label="Colunas" />
                colunas
              </span>
            )}
            {modo === 'cartela' && (
              <label className="flex items-center gap-2 text-xs text-zinc-400">
                Quantos bottons
                <input type="number" min={0} max={48} value={quantidade || ''} placeholder="auto" onChange={(e) => setQuantidade(Math.max(0, Math.min(48, Number(e.target.value) || 0)))} className="w-20 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-100" />
              </label>
            )}
          </div>
        )}

        <label className="block rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/60 p-4 text-sm text-zinc-300">
          <span className="font-semibold">Imagens</span>
          <span className="ml-2 text-xs text-zinc-500">PNG, JPG ou WEBP · uma ou várias</span>
          <input ref={arquivo} type="file" multiple accept="image/png,image/jpeg,image/webp" disabled={ocupado} onChange={(e) => void preparar(Array.from(e.target.files ?? []))} className="mt-3 block w-full text-xs" />
        </label>

        {recortes.length > 0 && (
          <div className="space-y-3">
            <div className={`grid gap-2 ${novoTipo === 'wallpaper' ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-3 sm:grid-cols-5 lg:grid-cols-7'}`}>
              {recortes.map((r) => (
                <div key={r.id} className={`rounded-xl border p-1.5 ${r.usar ? 'border-emerald-400/60 bg-zinc-950' : 'border-zinc-800 opacity-40'}`}>
                  <button type="button" onClick={() => setRecortes((v) => v.map((x) => (x.id === r.id ? { ...x, usar: !x.usar } : x)))} className="block w-full" title={r.usar ? 'Descartar esta peça' : 'Usar esta peça'}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.previa} alt="" className={`w-full ${novoTipo === 'wallpaper' ? 'aspect-video rounded-lg object-cover' : 'aspect-square object-contain'}`} style={{ background: 'repeating-conic-gradient(#2a2d33 0 25%, #1d1f24 0 50%) 0 0 / 16px 16px' }} />
                  </button>
                  <input value={r.nome} onChange={(e) => setRecortes((v) => v.map((x) => (x.id === r.id ? { ...x, nome: e.target.value } : x)))} className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-1.5 py-1 text-[11px] text-zinc-100" aria-label="Nome do item" />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" disabled={ocupado || !recortes.some((r) => r.usar)} onClick={() => void salvarNaColecao()} className="rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-bold text-zinc-950 disabled:opacity-50">
                {ocupado ? 'Salvando…' : `Salvar ${recortes.filter((r) => r.usar).length} na coleção`}
              </button>
              <button type="button" onClick={() => setRecortes([])} className="text-xs text-zinc-400 hover:text-zinc-100">
                Descartar tudo
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
