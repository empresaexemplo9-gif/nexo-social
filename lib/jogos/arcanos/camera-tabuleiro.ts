/** Câmera superior oblíqua: mantém o chão visível e as peças em pé. */
export const ELEVACAO_TABULEIRO=55*Math.PI/180;
export function posicaoNoTabuleiro(x:number,y:number,altura:number){
  return{x,y:0,z:(y-altura/2)/Math.sin(ELEVACAO_TABULEIRO)};
}
export function escalaNoTabuleiro(largura:number,altura:number,tamanho:{largura:number;altura:number;profundidade:number}){
  const projetada=tamanho.altura*Math.cos(ELEVACAO_TABULEIRO)+tamanho.profundidade*Math.sin(ELEVACAO_TABULEIRO);
  return Math.min(largura*.84/Math.max(tamanho.largura,tamanho.profundidade),altura*.94/projetada);
}
