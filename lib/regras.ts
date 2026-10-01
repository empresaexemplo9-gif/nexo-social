// Regras da comunidade: o mesmo texto no cadastro, no aviso para quem já tinha
// conta, na página de quem foi banido e nos Termos. A regra em si vale no
// banco (db/moderacao.sql): o texto com termo proibido não é gravado e quem o
// escreveu é banido para sempre.

export const REGRAS_TITULO = 'Regras da comunidade';

export const REGRAS_RESUMO =
  'A nexo.social é um ambiente seguro e saudável, feito para conversar sobre o que a gente gosta.';

export const REGRAS: string[] = [
  'Converse com respeito: discorde das ideias, nunca ataque as pessoas.',
  'Palavras grotescas e desnecessárias — palavrão pesado, termo sexual explícito e ofensa de ódio (racismo, homofobia, transfobia, capacitismo) — não são aceitas em lugar nenhum: publicações, comentários, chats, recados, grupos, listas, rodas de conversa e nome do perfil.',
  'Quem escrever uma delas é banido na hora e perde o acesso à plataforma para sempre. O texto não chega a ser publicado.',
  'Você decide quem vê o que publica: todos, só os seus contatos ou um grupo de que participa.',
];

/** A frase curta que vai junto de cada caixa de texto da plataforma. */
export const LEMBRETE_DAS_REGRAS = 'Palavras grotescas levam ao banimento permanente da conta.';

export const MENSAGEM_BANIMENTO =
  'Sua conta foi banida permanentemente por usar palavras que ferem as regras da comunidade.';
