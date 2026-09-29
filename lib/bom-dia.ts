/** Acervo editorial. A data e a rodada selecionam sugestões sem depender de cron. */
export const BOM_DIA_TIMEZONE = 'America/Sao_Paulo';
export const DIET_FILTERS = {
  todas: 'Todas as receitas', vegetariana: 'Vegetarianas', vegana: 'Veganas',
  'sem-leite': 'Sem leite nos ingredientes', 'sem-gluten': 'Sem glúten nos ingredientes',
} as const;
export type DietFilter = keyof typeof DIET_FILTERS;
export interface Recipe {
  id: string; title: string; minutes: number; servings: string;
  tags: Exclude<DietFilter, 'todas'>[]; ingredients: string[]; steps: string[];
}
export const RECIPES: Recipe[] = [
  { id: 'banana-aveia', title: 'Panqueca de banana e aveia', minutes: 10, servings: '1 porção', tags: ['vegetariana', 'sem-leite', 'sem-gluten'],
    ingredients: ['1 banana madura', '1 ovo', '2 colheres (sopa) de aveia certificada sem glúten', '1 colher (chá) de óleo', 'Canela a gosto'],
    steps: ['Amasse a banana e misture com o ovo, a aveia e a canela.', 'Aqueça uma frigideira antiaderente com o óleo, em fogo baixo.', 'Faça duas panquecas pequenas. Doure por cerca de 2 minutos de cada lado, até o centro ficar firme e o ovo completamente cozido.'] },
  { id: 'cuscuz-tomate', title: 'Cuscuz com tomate e ervas', minutes: 15, servings: '1 porção', tags: ['vegetariana', 'vegana', 'sem-leite', 'sem-gluten'],
    ingredients: ['½ xícara de flocão de milho sem glúten', '¼ de xícara de água', '½ tomate picado', '1 colher (chá) de azeite', 'Salsinha e uma pitada de sal'],
    steps: ['Misture o flocão, a água e o sal. Deixe hidratar por 5 minutos.', 'Coloque na cuscuzeira sem apertar e cozinhe no vapor por cerca de 7 minutos.', 'Solte com um garfo e misture o tomate, a salsinha e o azeite.'] },
  { id: 'iogurte-mamao', title: 'Iogurte com mamão e sementes', minutes: 5, servings: '1 porção', tags: ['vegetariana', 'sem-gluten'],
    ingredients: ['1 pote (170 g) de iogurte natural', '½ mamão papaia', '1 colher (sopa) de sementes de abóbora sem casca', '1 colher (sopa) de chia'],
    steps: ['Lave o mamão, retire as sementes e corte a polpa em cubos.', 'Coloque o iogurte em uma tigela e adicione o mamão.', 'Finalize com as sementes e sirva em seguida.'] },
  { id: 'tapioca-banana', title: 'Tapioca de banana com canela', minutes: 8, servings: '1 porção', tags: ['vegetariana', 'vegana', 'sem-leite', 'sem-gluten'],
    ingredients: ['3 colheres (sopa) de goma de tapioca hidratada', '1 banana', '1 colher (sopa) de pasta de amendoim sem leite', 'Canela a gosto'],
    steps: ['Aqueça uma frigideira e espalhe a goma em uma camada uniforme.', 'Quando a massa estiver unida, vire e aqueça por mais 30 segundos.', 'Recheie com banana em rodelas, pasta de amendoim e canela; dobre e sirva.'] },
  { id: 'ovos-tomate', title: 'Ovos mexidos com tomate', minutes: 10, servings: '1 porção', tags: ['vegetariana', 'sem-leite', 'sem-gluten'],
    ingredients: ['2 ovos', '½ tomate picado', '1 colher (chá) de azeite', 'Cebolinha e uma pitada de sal'],
    steps: ['Aqueça o azeite e refogue o tomate por 2 minutos.', 'Bata os ovos com um garfo e despeje na frigideira.', 'Mexa em fogo baixo até ficarem completamente cozidos, sem partes líquidas. Termine com cebolinha.'] },
  { id: 'pao-homus', title: 'Sanduíche de homus e pepino', minutes: 8, servings: '1 sanduíche', tags: ['vegetariana', 'vegana', 'sem-leite'],
    ingredients: ['2 fatias de pão integral sem leite ou ovos', '½ xícara de grão-de-bico cozido', '1 colher (chá) de azeite', '1 colher (chá) de limão', '2 colheres (sopa) de água', '4 rodelas de pepino'],
    steps: ['Amasse o grão-de-bico com azeite, limão e água até formar uma pasta.', 'Espalhe sobre uma fatia do pão.', 'Adicione o pepino lavado, feche o sanduíche e sirva.'] },
  { id: 'mingau-cacau', title: 'Mingau de aveia, banana e cacau', minutes: 10, servings: '1 porção', tags: ['vegetariana', 'vegana', 'sem-leite', 'sem-gluten'],
    ingredients: ['3 colheres (sopa) de aveia certificada sem glúten', '200 ml de bebida vegetal sem leite e sem glúten', '½ banana amassada', '1 colher (chá) de cacau em pó puro'],
    steps: ['Coloque todos os ingredientes em uma panela pequena.', 'Cozinhe em fogo baixo, mexendo, por 5 a 7 minutos até engrossar.', 'Se necessário, acrescente um pouco de água. Espere amornar antes de servir.'] },
  { id: 'crepioca', title: 'Crepioca de queijo e orégano', minutes: 10, servings: '1 porção', tags: ['vegetariana', 'sem-gluten'],
    ingredients: ['1 ovo', '2 colheres (sopa) de goma de tapioca hidratada', '2 colheres (sopa) de queijo minas picado', '1 colher (chá) de azeite', 'Orégano a gosto'],
    steps: ['Misture o ovo com a goma e o orégano.', 'Unte a frigideira, despeje a massa e cozinhe em fogo baixo.', 'Quando firmar, vire, adicione o queijo e dobre. Aqueça até o ovo ficar completamente cozido.'] },
  { id: 'fruta-amendoim', title: 'Salada de frutas com amendoim', minutes: 8, servings: '2 porções', tags: ['vegetariana', 'vegana', 'sem-leite', 'sem-gluten'],
    ingredients: ['1 banana', '1 maçã', '1 laranja', '2 colheres (sopa) de amendoim torrado sem sal'],
    steps: ['Lave as frutas. Descasque a banana e a laranja.', 'Corte as frutas em pedaços e misture, aproveitando o suco da laranja.', 'Divida em duas tigelas e acrescente o amendoim apenas ao servir.'] },
  { id: 'ricota-cenoura', title: 'Pão com pasta de ricota e cenoura', minutes: 8, servings: '1 porção', tags: ['vegetariana'],
    ingredients: ['2 fatias de pão integral', '3 colheres (sopa) de ricota', '½ cenoura pequena ralada', '1 colher (sopa) de iogurte natural', 'Salsinha a gosto'],
    steps: ['Amasse a ricota com o iogurte.', 'Misture a cenoura lavada e ralada e a salsinha.', 'Espalhe no pão e sirva. Mantenha qualquer sobra da pasta refrigerada.'] },
  { id: 'tofu-mexido', title: 'Tofu mexido com cenoura', minutes: 12, servings: '1 porção', tags: ['vegetariana', 'vegana', 'sem-leite', 'sem-gluten'],
    ingredients: ['150 g de tofu firme', '½ cenoura pequena ralada', '1 colher (chá) de azeite', '1 pitada de cúrcuma', 'Cebolinha e sal a gosto'],
    steps: ['Escorra e esfarele o tofu com um garfo.', 'Aqueça o azeite e refogue a cenoura por 2 minutos.', 'Acrescente o tofu e os temperos. Mexa por 5 minutos e finalize com cebolinha.'] },
  { id: 'vitamina', title: 'Vitamina de banana e morango', minutes: 5, servings: '1 copo grande', tags: ['vegetariana', 'vegana', 'sem-leite', 'sem-gluten'],
    ingredients: ['1 banana', '5 morangos lavados', '200 ml de bebida vegetal sem leite e sem glúten', '1 colher (sopa) de aveia certificada sem glúten'],
    steps: ['Retire os talos dos morangos e descasque a banana.', 'Bata tudo no liquidificador até ficar homogêneo.', 'Sirva logo após o preparo, sem coar.'] },
  { id: 'abacate-torrada', title: 'Torrada com abacate e tomate', minutes: 8, servings: '1 porção', tags: ['vegetariana', 'vegana', 'sem-leite'],
    ingredients: ['2 fatias de pão integral sem leite ou ovos', '¼ de abacate pequeno', '½ tomate', '1 colher (chá) de limão', 'Pimenta e uma pitada de sal'],
    steps: ['Toste as fatias de pão.', 'Amasse o abacate com o limão e os temperos.', 'Espalhe nas torradas e cubra com o tomate lavado e picado.'] },
  { id: 'omelete-espinafre', title: 'Omelete de espinafre', minutes: 12, servings: '1 porção', tags: ['vegetariana', 'sem-leite', 'sem-gluten'],
    ingredients: ['2 ovos', '½ xícara de folhas de espinafre lavadas', '1 colher (chá) de azeite', 'Uma pitada de sal'],
    steps: ['Refogue o espinafre no azeite por 2 minutos.', 'Bata os ovos e despeje sobre as folhas.', 'Cozinhe tampado em fogo baixo; vire com cuidado e termine o cozimento, sem deixar ovo líquido no centro.'] },
  { id: 'cuscuz-ovo', title: 'Cuscuz com ovo bem cozido', minutes: 15, servings: '1 porção', tags: ['vegetariana', 'sem-leite', 'sem-gluten'],
    ingredients: ['½ xícara de flocão de milho sem glúten', '¼ de xícara de água', '1 ovo', '1 colher (chá) de azeite', 'Salsinha e uma pitada de sal'],
    steps: ['Hidrate o flocão com água e sal por 5 minutos. Cozinhe na cuscuzeira por cerca de 7 minutos.', 'Enquanto isso, mexa o ovo no azeite até clara e gema ficarem firmes.', 'Solte o cuscuz e sirva com o ovo e a salsinha.'] },
  { id: 'wrap-feijao', title: 'Wrap de feijão e tomate', minutes: 10, servings: '1 wrap', tags: ['vegetariana', 'vegana', 'sem-leite'],
    ingredients: ['1 tortilha de trigo sem leite ou ovos', '⅓ de xícara de feijão cozido e escorrido', '½ tomate', '1 colher (chá) de azeite', '2 folhas de alface lavadas'],
    steps: ['Aqueça bem o feijão e amasse com o azeite.', 'Aqueça a tortilha em uma frigideira por 30 segundos de cada lado.', 'Espalhe o feijão, adicione o tomate e a alface e enrole.'] },
  { id: 'iogurte-maca', title: 'Iogurte com maçã e aveia', minutes: 5, servings: '1 porção', tags: ['vegetariana', 'sem-gluten'],
    ingredients: ['1 pote (170 g) de iogurte natural', '1 maçã pequena', '2 colheres (sopa) de aveia certificada sem glúten', 'Canela a gosto'],
    steps: ['Lave e corte a maçã em cubos, descartando as sementes.', 'Misture o iogurte e a aveia em uma tigela.', 'Acrescente a maçã e a canela. Sirva em seguida.'] },
  { id: 'batata-feijao', title: 'Batata-doce com pasta de feijão', minutes: 12, servings: '1 porção', tags: ['vegetariana', 'vegana', 'sem-leite', 'sem-gluten'],
    ingredients: ['1 batata-doce pequena já cozida (cerca de 120 g)', '⅓ de xícara de feijão branco cozido', '1 colher (chá) de azeite', '1 colher (chá) de limão', 'Salsinha a gosto'],
    steps: ['Corte a batata já cozida em rodelas e aqueça na frigideira com metade do azeite.', 'Aqueça bem o feijão e amasse com o restante do azeite e o limão.', 'Sirva a pasta sobre a batata e finalize com salsinha. O tempo considera a batata e o feijão previamente cozidos.'] },
];

export interface Routine { id: string; title: string; minutes: number; equipment: string; steps: string[] }
export const ROUTINES: Routine[] = [
  { id: 'caminhada', title: 'Caminhada para começar', minutes: 10, equipment: 'Local plano e calçado confortável', steps: ['Caminhe devagar por 2 minutos.', 'Siga por 6 minutos em um ritmo em que consiga conversar sem dificuldade. Pode dividir em dois blocos, com pausa.', 'Reduza o ritmo por 2 minutos. A proposta é terminar confortável, sem buscar velocidade.'] },
  { id: 'mobilidade', title: 'Mobilidade suave', minutes: 6, equipment: 'Cadeira firme, sem rodinhas', steps: ['Sentado, apoie os pés e movimente os tornozelos lentamente por 1 minuto.', 'Faça pequenos círculos com os ombros por 1 minuto, sem forçar.', 'Estenda e flexione um joelho de cada vez por 1 minuto, em amplitude confortável.', 'Descanse 1 minuto e repita os movimentos que ficaram confortáveis por mais 2 minutos.'] },
  { id: 'pausa-ativa', title: 'Pausa ativa entre tarefas', minutes: 5, equipment: 'Espaço livre ao lado da mesa', steps: ['Afaste a cadeira e caminhe devagar por 2 minutos.', 'Movimente ombros e braços suavemente por 1 minuto, sem elevar além do confortável.', 'Caminhe mais 1 minuto e reserve o último minuto para voltar ao ritmo de repouso.'] },
  { id: 'apoio', title: 'Força leve com apoio', minutes: 8, equipment: 'Cadeira estável encostada na parede', steps: ['Caminhe devagar por 2 minutos para aquecer.', 'Se confortável, levante e sente na cadeira até 5 vezes, usando as mãos como apoio. Descanse 1 minuto.', 'Segurando o encosto, eleve e abaixe os calcanhares até 8 vezes, sem perder o equilíbrio. Descanse 1 minuto.', 'Repita somente se estiver confortável. Termine com caminhada lenta e descanso até completar aproximadamente 8 minutos.'] },
  { id: 'danca', title: 'Dança sem saltos', minutes: 10, equipment: 'Piso seguro e uma música de que você gosta', steps: ['Comece com passos curtos de um lado para o outro por 2 minutos.', 'Dance por 6 minutos em ritmo confortável, mantendo os pés próximos do chão e pausando quando precisar.', 'Diminua os passos por 2 minutos. Evite giros rápidos e não prenda a respiração.'] },
  { id: 'sentado', title: 'Movimento sentado', minutes: 6, equipment: 'Cadeira firme com encosto', steps: ['Sente com apoio e pés no chão. Mova os tornozelos por 1 minuto.', 'Abra e feche as mãos e faça círculos pequenos com os ombros por 1 minuto.', 'Se confortável, estenda um joelho de cada vez por 1 minuto.', 'Descanse 1 minuto e repita por 2 minutos apenas os movimentos confortáveis, sem forçar articulações.'] },
];
export const TIPS = [
  { id: 'prioridade', title: 'Uma prioridade de cada vez', body: 'Escreva a tarefa mais importante da manhã e escolha um primeiro passo que caiba em 10 minutos.' },
  { id: 'agua', title: 'Água ao alcance', body: 'Deixe água por perto e faça pausas para beber ao longo do dia. Se você recebeu uma orientação de restrição de líquidos, siga sua equipe de saúde.' },
  { id: 'feira', title: 'Varie a feira', body: 'Escolha uma fruta ou hortaliça diferente esta semana. Compare os preços da estação e planeje onde vai usá-la.' },
  { id: 'mesa', title: 'Uma refeição com atenção', body: 'Reserve alguns minutos para comer sentado e sem outras tarefas. Observe os sabores e respeite sua fome e saciedade.' },
  { id: 'pausa', title: 'Interrompa longos períodos sentado', body: 'Entre duas tarefas, faça uma pausa curta para caminhar ou movimentar-se conforme sua possibilidade.' },
  { id: 'lista', title: 'Facilite o próximo café', body: 'Confira hoje o que já existe na despensa. Separe os utensílios e anote só os ingredientes que faltam.' },
  { id: 'sono', title: 'Dê espaço ao descanso', body: 'Organize um horário de descanso possível para a sua rotina. Observe o que atrapalha esse momento e ajuste uma coisa de cada vez.' },
  { id: 'notificacoes', title: 'Um bloco de foco', body: 'Escolha uma tarefa, silencie notificações dispensáveis e trabalhe por 15 minutos. Depois, faça uma pausa e avalie o próximo passo.' },
  { id: 'companhia', title: 'Movimento com companhia', body: 'Convide alguém para uma caminhada leve ou uma atividade de que vocês gostem. Combine um tempo possível, sem competição.' },
  { id: 'preparo', title: 'Cozinhe uma base versátil', body: 'Ao preparar feijão ou legumes, planeje uma porção para outra refeição. Refrigere as sobras prontamente em recipientes limpos e fechados.' },
  { id: 'leitura', title: 'Dez minutos para descobrir', body: 'Escolha um livro, uma receita ou um assunto fora da sua rotina e reserve alguns minutos para explorar.' },
  { id: 'fim', title: 'Reconheça um passo possível', body: 'Anote uma coisa que conseguiu fazer hoje. Use isso para planejar um próximo passo pequeno e realista.' },
];

export function dayKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: BOM_DIA_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  return ['year', 'month', 'day'].map(type => parts.find(p => p.type === type)!.value).join('-');
}
export function dayNumber(day: string): number { return Math.floor(Date.parse(`${day}T12:00:00Z`) / 86400000); }
function rotate<T>(items: T[], start: number, count: number): T[] {
  return Array.from({ length: Math.min(count, items.length) }, (_, i) => items[((start + i) % items.length + items.length) % items.length]);
}
export function selectBomDia(day: string, round = 0, diet: DietFilter = 'todas') {
  const sequence = dayNumber(day) + (Number.isFinite(round) ? Math.trunc(round) : 0);
  const recipes = RECIPES.filter(r => diet === 'todas' || r.tags.includes(diet));
  return {
    recipes: rotate(recipes, sequence * 3, 3), routine: rotate(ROUTINES, sequence, 1)[0],
    tips: rotate(TIPS, sequence * 3, 3), musicVariation: ((sequence % 5) + 5) % 5,
    totalRecipes: recipes.length,
  };
}
