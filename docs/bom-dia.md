# Bom Dia: seleção diária e descobertas

A home e `/bom-dia` usam a seleção de `lib/bom-dia.ts`. São 18 receitas completas,
seis rotinas leves e 12 dicas editoriais. A data é calculada em
`America/Sao_Paulo`, independentemente do fuso do servidor ou do aparelho.

A cada dia mudam as três receitas, a rotina, as três dicas e a rodada musical.
O botão **Ver outras ideias** também troca a seleção. O acervo é finito e volta
a circular; a seção de descobertas consulta conteúdo externo continuamente.
Uma aba aberta confere a virada do dia a cada minuto e ao recuperar o foco.
O cartão da home encaminha a rodada escolhida para a página completa.

## Descobertas externas

`/api/bom-dia/novidades` exige autenticação e responde com `private, no-store`.
Cada fonte tem cache no servidor de uma hora; a tela consulta ao abrir, ao
recuperar foco, a cada 30 minutos ou pelo botão de atualização. Não requer cron,
chave adicional ou assinatura. O cache evita uma consulta externa por visitante.

- Panelinha: receitas do acervo de café da manhã e vídeos publicados pelo canal
  oficial. ID do canal verificado no próprio site do Panelinha.
- Sesc São Paulo: publicações do canal oficial relacionadas a exercício,
  mobilidade, ginástica e bem-estar. O feed pode não trazer um vídeo desses
  temas a cada atualização.
- Vídeos sem data válida, no futuro ou publicados há mais de 90 dias são
  descartados. Receitas do site sem data ficam identificadas como seleção da
  fonte, sem afirmar que são novas publicações.
- Cada fonte falha isoladamente. A página continua oferecendo seu acervo,
  mostrando a indisponibilidade e os links das fontes. HTML externo não é
  inserido na tela; somente títulos e URLs validados são usados.

## Supabase e administração

Não é necessária uma nova migração. A tabela existente `bom_dia` continua
recebendo a curadoria do administrador. Apenas o registro global mais recente,
publicado nos últimos sete dias, aparece como complemento às sugestões. Um
registro antigo não trava mais toda a página.

Em 29/09/2026 foi confirmada pela Data API do projeto
`srunjulrflvsbrkhllaf` a presença de `bom_dia`, `platform_access`,
`platform_invite_balances`, `platform_invites` e `community_chat_messages`.
Esta conferência de leitura não reaplicou SQL nem substitui uma auditoria das
políticas RLS. O conector administrativo dessa sessão não tinha permissão
sobre o projeto e o navegador solicitou login.

## Validação

- 51 testes passaram, incluindo virada do dia/ano em São Paulo, troca manual,
  filtros alimentares, isolamento de falhas, datas de fontes, controle de
  autenticação e criação do player de música.
- `pnpm exec tsc --noEmit` passou. Foi executado separadamente porque a
  configuração herdada pula a checagem de tipos durante o build.
- `pnpm build` concluiu.
- Consulta real às três fontes retornou sucesso e seis indicações nesta
  execução; nenhuma publicação recente de movimento estava no feed do Sesc.
- A sessão do navegador disponível pediu login em produção; não foi executado
  um teste de reprodução de áudio numa conta autenticada real.
