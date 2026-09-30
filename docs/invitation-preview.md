# Prévia dos convites

132 adesivos das pranchas originais (enviadas em alta) foram recortados um a
um, com fundo transparente e sombra de contato, em
`public/convite-assets/adesivos/NNN.png`. O catálogo fica em
`lib/invite-stickers.ts`.

Cada adesivo pertence a um tema (`lib/invite-themes.ts`). O tema define a
estética inteira do convite, tirada do adesivo: cores, fontes
(`public/convite-assets/fonts`), textura (`public/convite-assets/texturas`),
ornamentos (retícula, xadrez, costura, globo, selo circular, código de barras
etc.) e o próprio texto. Temas com vários adesivos alternam o título.

O token aleatório escolhe o adesivo e um número de série (Nº 0001–9999) de
forma determinística. A mesma URL mantém a mesma imagem; o número muda detalhes
do cartão (inclinação do adesivo, lado, código de barras), então cada convite é
único. Não são necessárias migrações nem novos campos no Supabase.

- `/convite/<token>` é a página pública, vestida com o tema do adesivo, e
  encaminha para o cadastro existente.
- `/convite/arte/<variante>?n=<número>&v=6` produz o PNG 1200 × 630
  (`lib/invite-card.tsx`) sem autenticação e sem receber o token, nome, e-mail
  ou qualquer dado da conta.
- O adesivo nunca é ampliado além de 1,6× o arquivo original (2× nos muito
  pequenos), para não perder nitidez; a página mostra o adesivo no tamanho real.
- `/convite-assets/...` (adesivos, fontes e texturas) é público; o restante da
  plataforma continua protegido pelo middleware.
- Visualizar a prévia não valida, reserva nem consome o convite.
- Em Meus convites, cada link mostra a edição, o número e o adesivo, e o convite
  recém-criado é revelado com o tema dele.

Aplicativos de mensagem podem manter previews antigos no cache.
