// Links de bilheteria — parte pura, usável no navegador.
//
// Fica separada de lib/tickets.ts porque aquele é `server-only`: guarda tokens
// e chama as APIs. Aqui só há montagem de URL, que o cliente pode usar.

export interface TicketLink {
  label: string;
  url: string;
  /** true = link direto de compra; false = busca na bilheteria. */
  direto: boolean;
}

const q = (s: string) => encodeURIComponent(s.trim());

/**
 * Onde comprar ingresso de uma partida.
 *
 * A agenda esportiva (ESPN/TheSportsDB) traz o jogo, mas nenhuma das duas é
 * bilheteria — elas não têm link de venda. E cada clube e federação vende num
 * lugar diferente: o mesmo campeonato pode ter jogo no Ticketmaster, no
 * FutebolCard e no site do próprio clube.
 *
 * Por isso levamos à busca das bilheterias com o nome do mandante, em vez de
 * inventar um link de compra que não existe.
 */
export function ticketSearchForMatch(mandante: string, competicao: string): TicketLink[] {
  const termo = (mandante || competicao || '').trim();
  return [
    { label: 'Ticketmaster', url: `https://www.ticketmaster.com.br/search?q=${q(termo)}`, direto: false },
    { label: 'Ingresso.com', url: `https://www.ingresso.com/busca?q=${q(termo)}`, direto: false },
    { label: 'Sympla', url: `https://www.sympla.com.br/eventos?s=${q(`${termo} ingresso`)}`, direto: false },
    { label: 'Eventim', url: `https://www.eventim.com.br/search/?affiliate=BR1&searchterm=${q(termo)}`, direto: false },
    { label: 'FutebolCard', url: 'https://www.futebolcard.com/', direto: false },
  ];
}
