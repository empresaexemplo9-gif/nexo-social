import type {CartaNova,ArteNova} from './grimorios';
const ORDEM:Record<string,string[]>={
  fogo:['branna','kael','seryth','dhorun','rhazdor','ithram','alena','vaelor','mirva','tarek'],
  agua:['thalgor','neruma','lysara','orveth','maelia','iren','varessa','darian','nymera','taeron'],
  terra:['galdren','heska','edris','vorna','nalda','odrin','kevara','bromel','sirena','uldar'],
  ar:['aervan','zelka','ilyss','roven','saelis','yunor','thessa','kairon','velira','ossian'],
  luz:['solvren','elthia','aurelis','nimer','evelune','calion','seraphra','dovain','lethira','ardel'],
  escuridao:['varkesh','nysora','morvyn','eshara','velmira','othren','zaryss','dravenor','selkira','rhaiven'],
};
/** Artes derivadas dos cards, com corpo completo e fundo transparente; originais intactos. */
export function arteDaMiniatura(carta:CartaNova):ArteNova{
  const nome=carta.id.slice(carta.elemento.length+1),posicao=ORDEM[carta.elemento]?.indexOf(nome)??-1;
  if(carta.tipo!=='personagem'||posicao<0)throw new Error(`Miniatura não definida: ${carta.id}`);
  if(carta.elemento==='agua')return{src:`/jogos/arcanos/miniaturas/agua-${Math.floor(posicao/5)+1}.png`,colunas:5,linhas:1,posicao:posicao%5};
  return{src:`/jogos/arcanos/miniaturas/${carta.elemento}.png`,colunas:5,linhas:2,posicao};
}
