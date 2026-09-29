# Prévia dos convites

151 adesivos das quatro pranchas originais formam o catálogo em
`lib/invite-stickers.ts`. As imagens originais são preservadas; o gerador de
Open Graph usa viewports individuais em HTML/CSS para cada adesivo.

O token aleatório existente escolhe uma variante de forma determinística. A
mesma URL mantém a mesma imagem, e não são necessárias migrações nem novos
campos no Supabase. A paleta de destaque acompanha as cores do adesivo.

- Novos links e a listagem usam `/convite/<token>`.
- A página pública apresenta o convite e encaminha para o cadastro existente.
- URLs antigas `/login?cadastro=1&convite=...` também recebem metadados próprios.
- `/convite/arte/<variante>?v=2` produz PNG 1200 × 630 sem autenticação e sem
  receber o token, nome, e-mail ou qualquer dado da conta.
- O middleware mantém o gerenciamento de convites e a plataforma protegidos.
- Visualizar a prévia não valida, reserva nem consome o convite. O cadastro
  continua verificando sua disponibilidade no fluxo existente.
- A lista mostra a miniatura e permite copiar ou compartilhar pelo navegador.

Aplicativos de mensagem podem manter previews antigos no cache. Copiar o link
novo pela tela Meus convites usa a nova página de apresentação.
