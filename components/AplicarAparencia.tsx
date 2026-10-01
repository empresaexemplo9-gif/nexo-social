'use client';

import { useEffect } from 'react';
import { usePreferences } from '@/lib/preferences';
import { APARENCIA_PADRAO, CACHE_DA_APARENCIA, CACHE_DO_FUNDO_EXCLUSIVO, CACHE_DO_MURO } from '@/lib/aparencia-tipos';

/**
 * Aplica a cor dos botões e destaques escolhida pela pessoa em todas as
 * páginas (variáveis CSS no <html>). As variáveis prontas ficam guardadas no
 * aparelho: o script do layout as aplica antes de pintar, sem piscar o azul.
 * Também marca no <html> a versão dos murais (data-muro="claro") e o plano de
 * fundo exclusivo (data-fundo-exclusivo="home" | "todas", com a imagem em
 * --fundo-exclusivo), lidos pelo CSS do .tema-mural.
 */
export default function AplicarAparencia() {
  const { prefs, ready, save } = usePreferences();
  const botoes = prefs.aparencia?.botoes ?? null;
  const muro = prefs.aparencia?.muro ?? 'escuro';
  const exclusivo = prefs.aparencia?.exclusivo ?? null;
  const fundoUrl = exclusivo?.url ?? '';
  const fundoEscopo = exclusivo?.escopo ?? '';

  useEffect(() => {
    if (!ready) return;
    const raiz = document.documentElement;
    if (fundoUrl && fundoEscopo) {
      raiz.dataset.fundoExclusivo = fundoEscopo;
      raiz.style.setProperty('--fundo-exclusivo', `url("${fundoUrl}")`);
    } else {
      delete raiz.dataset.fundoExclusivo;
      raiz.style.removeProperty('--fundo-exclusivo');
    }
    try {
      if (fundoUrl) localStorage.setItem(CACHE_DO_FUNDO_EXCLUSIVO, JSON.stringify({ url: fundoUrl, escopo: fundoEscopo }));
      else localStorage.removeItem(CACHE_DO_FUNDO_EXCLUSIVO);
    } catch {
      /* sem armazenamento */
    }
  }, [fundoUrl, fundoEscopo, ready]);

  // Uma vez por sessão: o plano de fundo ainda é da pessoa? (o superadministrador pode tirar)
  const idDoFundo = exclusivo?.id ?? '';
  useEffect(() => {
    if (!ready || !idDoFundo) return;
    try {
      if (sessionStorage.getItem('nexo:fundo-exclusivo:conferido') === idDoFundo) return;
    } catch {
      /* sem armazenamento */
    }
    let vivo = true;
    fetch('/api/exclusivos?kind=wallpaper', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!vivo || !j || !Array.isArray(j.items)) return;
        if (j.items.some((i: { id: string }) => i.id === idDoFundo)) {
          try {
            sessionStorage.setItem('nexo:fundo-exclusivo:conferido', idDoFundo);
          } catch {
            /* sem armazenamento */
          }
        } else void save({ aparencia: { ...(prefs.aparencia ?? APARENCIA_PADRAO), exclusivo: null } });
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idDoFundo, ready]);

  useEffect(() => {
    if (!ready) return;
    const raiz = document.documentElement;
    if (muro === 'claro') raiz.dataset.muro = 'claro';
    else delete raiz.dataset.muro;
    try {
      if (muro === 'claro') localStorage.setItem(CACHE_DO_MURO, 'claro');
      else localStorage.removeItem(CACHE_DO_MURO);
    } catch {
      /* sem armazenamento */
    }
  }, [muro, ready]);

  useEffect(() => {
    if (!ready) return;
    const raiz = document.documentElement;
    let vivo = true;
    const limpar = (nomes: string[]) => nomes.forEach((n) => raiz.style.removeProperty(n));

    import('@/lib/aparencia').then(({ opcaoDeBotao, variaveisDoBotao, VARIAVEIS_DO_BOTAO }) => {
      if (!vivo) return;
      const opcao = opcaoDeBotao(botoes);
      if (!opcao) {
        limpar(VARIAVEIS_DO_BOTAO);
        try {
          localStorage.removeItem(CACHE_DA_APARENCIA);
        } catch {
          /* sem armazenamento */
        }
        return;
      }
      const vars = variaveisDoBotao(opcao.cor);
      for (const [n, v] of Object.entries(vars)) raiz.style.setProperty(n, v);
      try {
        localStorage.setItem(CACHE_DA_APARENCIA, JSON.stringify(vars));
      } catch {
        /* sem armazenamento */
      }
    }).catch(() => undefined);

    return () => {
      vivo = false;
    };
  }, [botoes, ready]);

  return null;
}
