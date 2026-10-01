# nexo-social / Agendrap

Plataforma de curadoria **personalizada** de conteúdo e **eventos por proximidade**, com estética _vintage-futurista_ acolhedora. Construída em **Next.js 14 (App Router)** + **Supabase** (Postgres, Auth, RLS).

## ✨ Recursos

- **Home com redirecionamento real** — cada módulo, botão e evento leva a uma área dedicada (`/tema/[slug]`, `/evento/[id]`, `/bom-dia`).
- **Personalização por perfil** — o questionário (`/questionario`) define os interesses; a home ordena conteúdos e eventos de acordo.
- **Eventos por proximidade** — geolocalização do smartphone/iPhone (`navigator.geolocation`) + fórmula de Haversine, com _fallback_ pela cidade do perfil.
- **Multi-tenant** — cadastro de conta **pessoal** ou **organização**; cada conta é um tenant isolado por RLS.
- **Compromissos dentro da plataforma** — em `/agenda`, quem cria escolhe as pessoas pelo nome (nada de e-mail). O convite fica na agenda e nas notificações de cada convidado até ele responder **positivo** (concordo) ou **negativo** (não concordo).
- **Comunidade** — em `/comunidade`, qualquer conta cria grupos ilimitados para compartilhar **fotos**, livros, músicas, clipes, filmes e links, organizar **álbuns**, e tem uma **sala sincronizada** para ouvir músicas e assistir a clipes juntos, no mesmo segundo. O controle do grupo é de quem cria (edita, troca a **imagem do grupo**, remove pessoas, apaga). Grupo **fechado**: só o dono convida; **aberto**: todo membro convida. **Convidar amigos** chama quem já tem conta (pelas notificações) e manda o link do grupo para quem ainda não tem (WhatsApp, Telegram, SMS, e-mail ou copiar): a pessoa cria o acesso e já entra no grupo.
- **Foto de perfil** — em `/conta`; aparece nos grupos, no mural e ao convidar.
- **Chamadas de áudio e vídeo** — em cada grupo: chamada com o grupo todo ou a dois (pelos membros), de vídeo ou de voz, até 8 pessoas. Só WebRTC do navegador, sem serviço de chamada de terceiros: a mídia vai direto entre os aparelhos, cifrada de ponta a ponta, e o Supabase Realtime (canal privado, só membros) apenas apresenta um aparelho ao outro. Qualidade: câmera em 1080p/30, Opus a 48 kHz com cancelamento de eco, teto de envio ajustado ao tamanho da chamada. Quem é chamado recebe o toque em qualquer página, com Atender/Recusar.
- **Música pelo Spotify, só aqui dentro** — "Entrar com Spotify" e ouvir na plataforma (Premium: faixas completas; sem entrar ou conta grátis: prévias de 30 s). Não há botão que leve para ouvir no app ou no site do Spotify.
- **Admin da plataforma** — `/admin` é exclusivo de `thiagohccarvalho00@gmail.com` (protegido no middleware **e** no servidor).
- **Backend completo** — API REST em Route Handlers, sessões via cookies (`@supabase/ssr`), seed idempotente e políticas RLS.

## 🎨 Identidade visual

- Neutros quentes (areia → café torrado) + acento **teal-menta** retrô e **terracota** (clay).
- Tipografia: **Fraunces** (serifa vintage, títulos) + **Space Grotesk** (sans futurista, interface).

## 🚀 Rodando localmente

```bash
pnpm install
cp .env.example .env.local   # opcional — sem isso, roda em modo demonstração
pnpm dev
```

Abra http://localhost:3000.

> **Modo demonstração:** sem credenciais Supabase, o app funciona com o dataset semente (`lib/data.ts`) e as escritas são simuladas.

## 🗄️ Configurando o backend (Supabase)

1. Crie um projeto em [supabase.com](https://supabase.com) e preencha o `.env.local` (veja `.env.example`).
2. No SQL Editor, rode **`db/schema.sql`** (tabelas, funções, trigger de provisionamento e políticas RLS).
3. (Opcional) rode **`db/seed.sql`** para um seed mínimo, ou use o passo 5.
4. Em Auth → Providers, habilite **Email**.
5. Cadastre-se em `/login` com `thiagohccarvalho00@gmail.com` para virar admin, entre em `/admin` e clique em **🌱 Popular banco** para semear todo o dataset.
6. Regras da comunidade: rode **`db/moderacao.sql`** depois das migrações da Comunidade e de `platform-invites.sql`. Ele cria a lista de palavras proibidas (editável no painel, aba Moderação), o gatilho que confere todo texto escrito na plataforma — o texto com palavra proibida não é gravado e quem o escreveu é banido na hora, perde o acesso e não entra mais — e o registro do aceite das regras (no cadastro ou no aviso que aparece uma vez para quem já tinha conta).
7. Mural e páginas pessoais: rode **`db/social.sql`** depois do `moderacao.sql`. Ele cria as publicações (conversa, pedir opinião, resenha, experiência, vídeo e livro lido), as opiniões e reações, a página de cada pessoa (bio e quem a vê) e a busca por conteúdo. Quem vê cada publicação é escolha de quem publica — todos, só os contatos ou um grupo — e o banco aplica isso em toda consulta; todo texto novo passa pela moderação.
8. Listas e rodas de conversa: rode **`db/listas-rodas.sql`** depois do `social.sql`. Ele cria as listas (playlists de músicas e clipes, livros, filmes, séries, jogos) com reações e comentários em cada item e na lista inteira — as abertas a todos aparecem como sugestão —, e as rodas de conversa: quando quem abriu encerra, ou depois de 24 h sem mensagem, a conversa é apagada e fica só, por 7 dias, a lista de quem participou, para quem quiser se adicionar aos contatos. Com o pg_cron ligado, a faxina roda a cada 15 minutos. No item da lista, palavra proibida no nome da obra só barra o item; na fala de quem escreve, bane.
9. Depois do `schema.sql` e das outras migrações de `db/`, rode **`db/desempenho-e-seguranca.sql`** (de novo sempre que rodar o `schema.sql` outra vez): fixa o `search_path` das funções, faz as políticas de RLS calcularem o usuário uma vez por consulta e cria os índices das chaves estrangeiras.

> **Ingressos:** a plataforma não vende ingresso — cada evento leva à bilheteria oficial. Em bancos que tiveram a antiga bilheteria própria, rodar o `db/schema.sql` já desliga a compra; para apagar também as tabelas de pedidos, exporte o que precisar e rode **`db/remover-bilheteria.sql`**.

## 🔌 API

| Método | Rota | Descrição | Acesso |
| --- | --- | --- | --- |
| `GET` | `/api/contents?topic=` | Lista conteúdos | Público |
| `GET` | `/api/events?topic=&lat=&lng=` | Eventos (ordenados por proximidade se lat/lng) | Público |
| `POST` | `/api/newsletter` | Inscrição na newsletter | Público |
| `GET` / `PUT` | `/api/preferences` | Preferências do questionário | Autenticado |
| `GET` | `/api/pessoas?q=` | Pessoas da plataforma para convidar (pelo nome) | Autenticado |
| `GET` / `POST` | `/api/agenda/appointments` | Compromissos; cria convidando por `participantIds` | Autenticado |
| `POST` | `/api/agenda/rsvp` | Resposta ao convite: `confirmado` (positivo) ou `recusado` (negativo) | Autenticado |
| `GET` / `PATCH` | `/api/agenda/notifications` | Notificações (convites sem resposta ficam pendentes) | Autenticado |
| `GET` / `POST` | `/api/comunidade/grupos` | Meus grupos e convites; cria grupo | Autenticado |
| `GET` / `PATCH` / `DELETE` | `/api/comunidade/grupos/[id]` | Grupo, membros e sala; editar, novo link, apagar (dono) | Membro |
| `POST` | `/api/comunidade/grupos/[id]/convites` | Convida contas da plataforma | Membro |
| `POST` | `/api/comunidade/grupos/[id]/resposta` | Aceita ou recusa o convite do grupo | Convidado |
| `DELETE` | `/api/comunidade/grupos/[id]/membros` | Sair do grupo / remover alguém (dono) | Membro |
| `GET` / `POST` / `DELETE` | `/api/comunidade/grupos/[id]/posts` | Mural do grupo (inclusive publicações de fotos) | Membro |
| `GET` / `PATCH` / `DELETE` | `/api/comunidade/grupos/[id]/fotos` | Fotos do grupo (links assinados), mover para álbum, apagar | Membro |
| `GET` / `POST` | `/api/comunidade/grupos/[id]/albuns` | Álbuns do grupo; cria álbum | Membro |
| `PATCH` / `DELETE` | `/api/comunidade/grupos/[id]/albuns/[albumId]` | Renomeia ou apaga o álbum (as fotos ficam) | Quem criou / dono |
| `PUT` / `DELETE` | `/api/me/foto` | Foto de perfil | Autenticado |
| `GET` / `PUT` | `/api/comunidade/grupos/[id]/sala` | Sala sincronizada (o que toca e em que segundo) | Membro |
| `POST` | `/api/comunidade/entrar` | Entra no grupo pelo link de convite | Autenticado |
| `POST` | `/api/comunidade/grupos/[id]/chamada` | Avisa a chamada (grupo, ou `para` numa chamada a dois) | Membro |
| `GET` | `/api/chamada/ice` | Servidores STUN/TURN das chamadas | Autenticado |
| `GET` / `POST` | `/api/mural` | Publicações que você pode ver (filtros e busca); publica com quem vê | Autenticado |
| `GET` / `PATCH` / `DELETE` | `/api/mural/[id]` | Publicação e opiniões; editar (autor), apagar (autor ou dono do grupo) | Quem pode ver |
| `POST` / `DELETE` | `/api/mural/[id]/opinioes` | Opina ou responde; apaga opinião | Quem pode ver |
| `POST` | `/api/mural/[id]/reacao` | Reage (uma por pessoa) ou tira a reação | Quem pode ver |
| `GET` / `PATCH` | `/api/perfil` | Minha página: bio e quem vê | Autenticado |
| `GET` | `/api/pessoa/[id]` | Página de uma pessoa, conforme ela escolheu | Autenticado |
| `GET` | `/api/busca/conteudo` | Busca no que a comunidade publicou, listas, rodas, pessoas e matérias históricas | Autenticado |
| `GET` / `POST` | `/api/listas` | Sugestões, minhas, dos contatos ou de uma pessoa; cria lista | Autenticado |
| `GET` / `PATCH` / `DELETE` | `/api/listas/[id]` | Lista com itens, reações e comentários; editar e apagar (quem criou) | Quem pode ver |
| `POST` / `PATCH` / `DELETE` | `/api/listas/[id]/itens` | Põe item (à mão ou do YouTube), reordena, tira | Quem criou |
| `POST` | `/api/listas/[id]/reacao` | Reação à lista inteira ou a um item | Quem pode ver |
| `POST` / `DELETE` | `/api/listas/[id]/comentarios` | Comenta a lista inteira ou um item; apaga | Quem pode ver |
| `GET` / `POST` | `/api/rodas` | Rodas acontecendo e as que você participou; abre roda | Autenticado |
| `GET` / `POST` | `/api/rodas/[id]` | Roda, quem está e a conversa; entrar, sair, encerrar (quem abriu) | Quem pode ver |
| `POST` | `/api/rodas/[id]/mensagens` | Fala na roda | Quem está na roda |
| `POST` | `/api/admin/contents` | Cadastra conteúdo | Admin |
| `POST` | `/api/admin/events` | Cadastra evento | Admin |
| `POST` | `/api/admin/bom-dia` | Publica curadoria Bom Dia | Admin |
| `POST` | `/api/seed` | Popula o banco | Admin |

## 🔌 Integrações externas (opcional)

O app já funciona sem nenhuma chave de terceiros: as indicações usam o catálogo
próprio + **links de busca** para Sympla, Eventbrite, Ticketmaster, Bandsintown,
Spotify, YouTube Music, Deezer e YouTube.

Para importar eventos e mídias automaticamente, veja o passo a passo em
**[`docs/integracoes.md`](docs/integracoes.md)** — quais APIs são gratuitas,
como obter cada chave e quais não valem a pena (a busca pública do Eventbrite
foi descontinuada e a do Sympla é restrita ao organizador).

## 🧱 Arquitetura

- `app/` — páginas (server components) + Route Handlers (`app/api/*`).
- `components/` — ilhas de cliente (interatividade) e UI reutilizável.
- `lib/data.ts` — taxonomia de temas + dataset semente + tipos.
- `lib/repo.ts` — leitura de dados (Supabase → tipos do app, com _fallback_).
- `lib/supabase*.ts` — clientes de navegador, servidor (cookies) e service role.
- `middleware.ts` — renovação de sessão + proteção de `/admin` e `/conta`.
- `db/` — `schema.sql` e `seed.sql`; `test-multitenant.sql`, `test-comunidade.sql`, `test-moderacao.sql`, `test-social.sql` e `test-listas-rodas.sql` testam as regras num Postgres local (nunca no Supabase).

> **Comunidade e convites:** depois de atualizar o código, rode de novo o **`db/schema.sql`** no SQL Editor. Ele cria as tabelas `community_*`, os gatilhos que geram as notificações de convite e resposta (sem depender da service role) e liga o Realtime em `notifications`, `community_sessions` e `community_posts`. Também cria no Storage os buckets **`perfis`** (público: fotos de perfil e imagens dos grupos) e **`comunidade`** (privado: fotos do mural e dos álbuns, abertas só para membros por link assinado), com as políticas de quem envia e quem apaga. As imagens são reduzidas no navegador antes do envio (e perdem os dados de GPS da câmera). E libera os canais privados do Realtime das chamadas (`realtime.messages`: `grupo:<id>:chamada` para membros, `grupo:<id>:dupla:<a>:<b>` só para as duas pessoas).

> **Chamadas em redes restritas:** por padrão as chamadas usam STUN públicos (só descobrem o endereço de cada aparelho; nenhuma mídia passa por eles). Em algumas redes — 4G com CGNAT, Wi-Fi corporativo — a conexão direta não fecha e só um servidor **TURN** resolve. Para ter o seu, suba um [coturn](https://github.com/coturn/coturn) com `use-auth-secret` e defina `TURN_URLS` e `TURN_SECRET` (veja `.env.example`); cada pessoa recebe uma credencial de 12 h gerada no servidor.
