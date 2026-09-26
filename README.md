# nexo-social / Agendrap

Plataforma de curadoria **personalizada** de conteúdo e **eventos por proximidade**, com estética _vintage-futurista_ acolhedora. Construída em **Next.js 14 (App Router)** + **Supabase** (Postgres, Auth, RLS).

## ✨ Recursos

- **Home com redirecionamento real** — cada módulo, botão e evento leva a uma área dedicada (`/tema/[slug]`, `/evento/[id]`, `/bom-dia`).
- **Personalização por perfil** — o questionário (`/questionario`) define os interesses; a home ordena conteúdos e eventos de acordo.
- **Eventos por proximidade** — geolocalização do smartphone/iPhone (`navigator.geolocation`) + fórmula de Haversine, com _fallback_ pela cidade do perfil.
- **Multi-tenant** — cadastro de conta **pessoal** ou **organização**; cada conta é um tenant isolado por RLS.
- **Compromissos dentro da plataforma** — em `/agenda`, quem cria escolhe as pessoas pelo nome (nada de e-mail). O convite fica na agenda e nas notificações de cada convidado até ele responder **positivo** (concordo) ou **negativo** (não concordo).
- **Comunidade** — em `/comunidade`, qualquer conta cria grupos ilimitados para compartilhar livros, músicas, clipes, filmes e links, e tem uma **sala sincronizada** para ouvir músicas e assistir a clipes juntos, no mesmo segundo. **Convidar amigos** chama quem já tem conta (pelas notificações) e manda o link do grupo para quem ainda não tem (WhatsApp, Telegram, SMS, e-mail ou copiar): a pessoa cria o acesso e já entra no grupo.
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
| `GET` / `POST` / `DELETE` | `/api/comunidade/grupos/[id]/posts` | Mural do grupo | Membro |
| `GET` / `PUT` | `/api/comunidade/grupos/[id]/sala` | Sala sincronizada (o que toca e em que segundo) | Membro |
| `POST` | `/api/comunidade/entrar` | Entra no grupo pelo link de convite | Autenticado |
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
- `db/` — `schema.sql` e `seed.sql`; `test-multitenant.sql` e `test-comunidade.sql` testam as regras num Postgres local (nunca no Supabase).

> **Comunidade e convites:** depois de atualizar o código, rode de novo o **`db/schema.sql`** no SQL Editor. Ele cria as tabelas `community_*`, os gatilhos que geram as notificações de convite e resposta (sem depender da service role) e liga o Realtime em `notifications`, `community_sessions` e `community_posts`.
