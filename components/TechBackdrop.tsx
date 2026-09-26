import React from 'react';

/**
 * Fundo fixo de todas as páginas: papel claro com manchas de azul e laranja
 * que derivam devagar, a placa de circuito e a grade em perspectiva em traço
 * fino, uma faixa de luz passando e o grão do papel por cima.
 *
 * Fica em camadas `fixed` em vez de `background-attachment: fixed`, que o
 * Safari do iPhone ignora — lá o fundo rolaria junto e cortaria no meio.
 * As imagens são SVG próprios (public/bg), leves e nítidos em qualquer tela.
 */
export default function TechBackdrop() {
  return (
    <div aria-hidden className="fundo-tech">
      <div className="fundo-tech__brilhos" />
      <div className="fundo-tech__circuito" />
      <div className="fundo-tech__grade" />
      <div className="fundo-tech__varredura" />
      <div className="fundo-tech__grao" />
    </div>
  );
}
