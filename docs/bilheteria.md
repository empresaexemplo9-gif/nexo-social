# Bilheteria própria — vender ingresso dentro da nexo.social

A compra acontece inteira na plataforma: escolher o lote, pagar e receber o
ingresso com QR Code, sem abrir o site de ninguém. Este documento explica como
ligar a venda, o que cada peça faz e por que foi feita assim.

## O que vende aqui e o que não vende

| Origem do evento | Onde se compra | Por quê |
| --- | --- | --- |
| Criado na plataforma (você é o organizador) | **Aqui**, com PIX e QR próprio | O estoque é seu |
| Importado do Sympla, Eventbrite, Ticketmaster | Na bilheteria de origem | O estoque é deles: nenhuma dessas APIs vende ingresso de terceiro, e revender exigiria contrato e repasse |

A página do evento decide sozinha: se existe algum lote cadastrado, mostra o
checkout interno; se não existe, mostra o link da bilheteria de origem. Os dois
nunca aparecem juntos — dois botões "comprar" apontando para estoques
diferentes é como se vende o mesmo lugar duas vezes.

## Ligando a venda

1. **Rode o `db/schema.sql`** no SQL Editor do Supabase. Ele cria
   `ticket_types`, `ticket_orders`, `ticket_order_items` e `tickets`, mais as
   funções de compra, emissão e check-in. É idempotente: rodar de novo não
   apaga nada.
2. **Cadastre os lotes** em `/admin` → aba **Ingressos**: nome, preço,
   quantidade e máximo por pedido. A venda abre na hora.
3. **Para ingresso pago**, configure o Mercado Pago (abaixo). Ingresso
   **gratuito funciona sem nenhuma configuração de pagamento**.

## Mercado Pago (só para ingresso pago)

Usamos a **API de Pagamentos** (Checkout Transparente), não o Checkout Pro. O
Checkout Pro devolve um link e manda o comprador para o site do Mercado Pago —
o redirecionamento que queremos evitar. A API de Pagamentos devolve o PIX
pronto (copia-e-cola + QR em base64), que desenhamos na nossa tela.

```bash
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...   # Suas integrações → Credenciais
MERCADOPAGO_WEBHOOK_SECRET=...          # Suas integrações → Webhooks
NEXT_PUBLIC_SITE_URL=https://seu-dominio # opcional; a Vercel já resolve
```

**Webhook**: cadastre `https://SEU-DOMINIO/api/ingressos/webhook` em
_Suas integrações → Webhooks_, evento **Pagamentos**. A rota responde ao GET
que o painel usa para validar a URL.

Cartão não está implementado: tokenizar cartão exige o SDK do Mercado Pago no
navegador e responsabilidade de PCI. PIX cobre o caso brasileiro sem sair da
plataforma e cai em segundos.

## Como o dinheiro e o estoque se comportam

- **Valores em centavos**, sempre inteiros. Real em ponto flutuante erra em
  contas simples (`0.1 + 0.2`), e ingresso é dinheiro de verdade.
- **A reserva vem antes da cobrança.** `criar_pedido_ingresso` trava a linha do
  lote (`SELECT … FOR UPDATE`) e baixa o estoque na mesma transação; só depois
  pedimos o PIX. Se cobrássemos primeiro, daria para pagar por um ingresso que
  já acabou. Duas compras simultâneas do último ingresso: uma passa, a outra
  recebe "Restam apenas 0".
- **A reserva expira em 15 minutos.** `expirar_pedidos_vencidos()` devolve ao
  estoque o que não foi pago — chame por rotina agendada (pg_cron ou um job).
- **Emissão é idempotente.** Webhook repetido não gera ingresso duplicado.
- **Cancelar devolve o estoque** e invalida os ingressos já emitidos.

## Quem pode fazer o quê

A parte que mais importa e a menos óbvia: o PostgreSQL concede `EXECUTE` a
`PUBLIC` em toda função nova, e o PostgREST publica `/rest/v1/rpc/<função>`.
Uma função `SECURITY DEFINER` sem `REVOKE` fica ao alcance de qualquer pessoa
logada — e `SECURITY DEFINER` ignora RLS. Sem os `REVOKE` do final do schema,
um comprador chamava `confirmar_pedido_ingresso` no próprio pedido e saía com o
ingresso sem pagar. Um `GRANT` sozinho não resolve: ele soma ao que `PUBLIC` já
tem.

| Função | Quem chama |
| --- | --- |
| `criar_pedido_ingresso` | usuário logado (exige `auth.uid()`, respeita estoque e limite) |
| `cancelar_meu_pedido` | usuário logado, só no próprio pedido pendente |
| `validar_ingresso` | organizador do evento ou admin da plataforma |
| `confirmar_pedido_ingresso`, `emitir_ingressos`, `cancelar_pedido_ingresso`, `expirar_pedidos_vencidos` | **service role apenas** — chamadas pelo servidor |

Pedidos e ingressos não têm policy de INSERT/UPDATE de propósito: toda escrita
passa pelas funções acima.

## Confiança no webhook

A rota do webhook é pública — qualquer um pode inventar um POST dizendo "pago".
Por isso nada do corpo é levado a sério além do id do pagamento: a situação é
consultada na API do Mercado Pago com o nosso token, e o pedido a confirmar sai
do `external_reference` que **eles** devolvem. A assinatura `x-signature` é
conferida quando há segredo configurado, mas ela é a segunda barreira, não a
primeira.

A tela do PIX também reconcilia sozinha: enquanto o pedido está pendente, ela
pergunta a situação ao Mercado Pago. Assim o ingresso libera mesmo se o webhook
atrasar ou não chegar (em ambiente sem URL pública, por exemplo).

## Check-in na entrada

`/ingressos/checkin` lê o QR pela câmera usando a `BarcodeDetector`, disponível
no Chrome do Android e no desktop. No Safari do iPhone ela não existe, e não
vale carregar um decodificador inteiro para a portaria: o código também vem
impresso embaixo do QR, e o campo de digitação resolve. Cada ingresso passa uma
vez só, e apenas quem organiza o evento consegue dar baixa.

## Testes

```bash
# Banco: 24 verificações — estoque, concorrência, idempotência e permissões
psql -f db/schema.sql -f db/test-bilheteria.sql
```

`db/test-bilheteria.sql` se recusa a rodar num projeto Supabase (ele cria
contas e pedidos falsos). Use um PostgreSQL local com `db/supabase-shim.sql`.
