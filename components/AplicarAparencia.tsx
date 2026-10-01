'use client';

import { useEffect } from 'react';
import { usePreferences } from '@/lib/preferences';
import { CACHE_DA_APARENCIA, CACHE_DO_MURO } from '@/lib/aparencia-tipos';

/**
 * Aplica a cor dos botões e destaques escolhida pela pessoa em todas as
 * páginas (variáveis CSS no <html>). As variáveis prontas ficam guardadas no
 * aparelho: o script do layout as aplica antes de pintar, sem piscar o azul.
 * Também marca no <html> a versão dos murais (data-muro="claro"), lida pelo
 * CSS do .tema-mural.
 */
export default function AplicarAparencia() {
  const { prefs, ready } = usePreferences();
  const botoes = prefs.aparencia?.botoes ?? null;
  const muro = prefs.aparencia?.muro ?? 'escuro';

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
