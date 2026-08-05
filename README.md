# nexo-social / Agendrap

Plataforma de curadoria **personalizada** de conteúdo e **eventos por proximidade**, com estética _vintage-futurista_ acolhedora. Construída em **Next.js 14 (App Router)** + **Supabase** (Postgres, Auth, RLS).

## ✨ Recursos

- **Home com redirecionamento real** — cada módulo, botão e evento leva a uma área dedicada (`/tema/[slug]`, `/evento/[id]`, `/bom-dia`).
- **Personalização por perfil** — o questionário (`/questionario`) define os interesses; a home ordena conteúdos e eventos de acordo.
- **Eventos por proximidade** — geolocalização do smartphone/iPhone (`navigator.geolocation`) + fórmula de Haversine, com _fallback_ pela cidade do perfil.
- **Multi-tenant** — cadastro de conta **pessoal** ou **organização**; cada conta é um tenant isolado por RLS.
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

## 🔌 API

| Método | Rota | Descrição | Acesso |
| --- | --- | --- | --- |
| `GET` | `/api/contents?topic=` | Lista conteúdos | Público |
| `GET` | `/api/events?topic=&lat=&lng=` | Eventos (ordenados por proximidade se lat/lng) | Público |
| `POST` | `/api/newsletter` | Inscrição na newsletter | Público |
| `GET` / `PUT` | `/api/preferences` | Preferências do questionário | Autenticado |
| `POST` | `/api/admin/contents` | Cadastra conteúdo | Admin |
| `POST` | `/api/admin/events` | Cadastra evento | Admin |
| `POST` | `/api/admin/bom-dia` | Publica curadoria Bom Dia | Admin |
| `POST` | `/api/seed` | Popula o banco | Admin |

## 🧱 Arquitetura

- `app/` — páginas (server components) + Route Handlers (`app/api/*`).
- `components/` — ilhas de cliente (interatividade) e UI reutilizável.
- `lib/data.ts` — taxonomia de temas + dataset semente + tipos.
- `lib/repo.ts` — leitura de dados (Supabase → tipos do app, com _fallback_).
- `lib/supabase*.ts` — clientes de navegador, servidor (cookies) e service role.
- `middleware.ts` — renovação de sessão + proteção de `/admin` e `/conta`.
- `db/` — `schema.sql` e `seed.sql`.
