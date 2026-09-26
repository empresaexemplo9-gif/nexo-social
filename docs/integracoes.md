# Guia: APIs gratuitas para alimentar as indicações

Como conseguir as credenciais de cada plataforma e onde colocá-las no projeto.
Todas as opções abaixo têm **plano gratuito**. Comece pelo Nível 1 — elas já
melhoram muito o resultado e **não custam nada nem exigem aprovação**.

> ⚠️ Termos de uso e limites mudam com frequência. Confira a página oficial de
> cada serviço antes de publicar — especialmente a parte de **uso comercial**.

---

## Nível 1 — Sem chave, sem cadastro (comece por aqui)

### 1. Nominatim / OpenStreetMap — descobrir a cidade real do usuário
Hoje o app escolhe a cidade mais próxima de uma lista fixa. Com o Nominatim ele
descobre a cidade **de verdade** a partir do GPS (reverse geocoding).

- **Cadastro:** nenhum.
- **Endpoint:** `https://nominatim.openstreetmap.org/reverse?lat=-23.55&lon=-46.63&format=json`
- **Regras:** máximo **1 requisição por segundo**, obrigatório enviar um
  `User-Agent` identificando a aplicação e um e-mail de contato. Não use para
  cargas pesadas — faça cache do resultado.
- **Custo:** gratuito.

### 2. IBGE — todos os municípios do Brasil
Amplia as "cidades próximas" das 29 atuais para os **5.570 municípios**.

- **Cadastro:** nenhum.
- **Endpoint:** `https://servicodados.ibge.gov.br/api/v1/localidades/municipios`
- **Atenção:** esse endpoint traz nome/UF, **mas não traz latitude/longitude**.
  Para as coordenadas, use uma destas opções:
  - geocodificar sob demanda com o Nominatim (e guardar no banco), ou
  - importar uma base pública de centroides municipais (IBGE/IPEA) uma única vez.
- **Custo:** gratuito.

### 3. Deezer — busca de música
- **Cadastro:** nenhum para a busca pública.
- **Endpoint:** `https://api.deezer.com/search?q=nome+do+artista`
- **Custo:** gratuito.

---

## Nível 2 — Chave gratuita, cadastro rápido

### 4. Spotify Web API — playlists e artistas
Melhor fonte para ligar um evento de música a faixas/artistas.

1. Acesse **developer.spotify.com/dashboard** e entre com sua conta Spotify.
2. **Create app** → dê um nome e descrição, marque **Web API** e **Web Playback SDK**.
   Em *Redirect URI* cadastre `https://nexo-social-two.vercel.app/api/spotify/retorno`
   (e o de cada domínio próprio que o site usar — precisa ser idêntico).
3. Copie o **Client ID** e o **Client Secret**.
4. No servidor, troque-os por um token (fluxo *Client Credentials*):
   `POST https://accounts.spotify.com/api/token` com `grant_type=client_credentials`
   e header `Authorization: Basic base64(client_id:client_secret)`.

- **Custo:** gratuito. O *Client Credentials* acessa catálogo público (busca,
  artistas, playlists) — não acessa dados de usuários.
- **Variáveis:** `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` (só no servidor).
  Opcional: `SPOTIFY_PLAYER_CLIENT_ID` e `SPOTIFY_PLAYER_CLIENT_SECRET`, o app
  usado no login e na reprodução (pode ser outro; sem o segredo, o login usa
  PKCE), e
  `SPOTIFY_REDIRECT_URI`, para fixar o endereço de retorno do login (útil em
  previews da Vercel, cujo domínio muda a cada deploy).

#### Ouvir completo: "Entrar com Spotify"
Sem conta, o player embutido do Spotify toca só prévias de 30 s — é regra do
Spotify. Por isso a trilha oferece dois caminhos:

- **Conta grátis:** o botão "Ouvir no app do Spotify" abre a playlist/faixa no
  app (ou no site) do Spotify, que toca completo, com anúncios.
- **Premium:** "Entrar com Spotify" faz o login (*Authorization Code*, com o
  segredo no servidor, ou PKCE sem ele; rotas em `app/api/spotify/`) e o **Web Playback SDK** toca as faixas completas
  dentro da nexo.social, sem anúncios, com a barra do player seguindo entre as
  páginas. O Spotify não libera esse player para contas grátis.

A sessão da pessoa fica num cookie httpOnly cifrado (sem banco); o navegador só
recebe o token de acesso de ~1 h, renovado pelo servidor.

**Limite do modo de desenvolvimento do Spotify (desde fev/2026):** o dono do app
precisa ter Premium e só **5 contas** cadastradas em *User Management* no painel
conseguem entrar. Liberar para todos exige o *Extended Quota Mode*, que o
Spotify só aceita de empresas com 250 mil usuários ativos por mês. Enquanto
isso, quem não está na lista vê o aviso "conta ainda não liberada" e continua
com as prévias e o botão do app. A busca de músicas (Client Credentials) não
tem esse limite.

### 5. Last.fm — artistas parecidos (melhora a recomendação)
Ótimo para "quem gosta de X também gosta de Y", alimentando o algoritmo.

1. Acesse **last.fm/api/account/create**.
2. Preencha nome e descrição da aplicação — a **chave sai na hora**.
3. Endpoint: `https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=...&api_key=...&format=json`

- **Custo:** gratuito para uso **não comercial**. Uso comercial exige licença —
  verifique antes de monetizar.
- **Variável:** `LASTFM_API_KEY`.

### 6. YouTube Data API v3 — vídeos
1. Acesse **console.cloud.google.com** e crie um projeto.
2. **APIs e serviços → Biblioteca** → ative **YouTube Data API v3**.
3. **Credenciais → Criar credenciais → Chave de API**.
4. Restrinja a chave (recomendado): só a YouTube Data API, e por IP do servidor.

- **Custo:** gratuito até **10.000 unidades/dia**. Cuidado: uma busca
  (`search.list`) custa **100 unidades** → ~100 buscas por dia. **Faça cache**
  dos resultados no banco, senão a cota acaba rápido.
- **Variável:** `YOUTUBE_API_KEY`.

#### O que a chave liga
- **Shorts** (`/shorts` e o widget da home): busca por interesse — tema, hobby,
  estilo musical, gênero de filme e de livro — em vídeo curto, no Brasil.
  Sem a chave, o feed usa os RSS públicos dos canais curados em `lib/shorts.ts`
  (a playlist só de Shorts de cada canal), sem custo de cota.
- **Descobrir** (`/descobrir`): completa filmes, audiolivros em português e
  tutoriais de hobby quando os acervos abertos trazem pouco. Sem a chave,
  aparece "Ver mais no YouTube" com a busca pronta.
- Custo: 100 unidades por busca, com cache de 12–24h por termo.

### Acervos abertos (sem chave) — assistir, ler e ouvir aqui dentro
- **Internet Archive** (`archive.org/advancedsearch.php`): filmes em domínio
  público (coleções curadas) e audiolivros do LibriVox (`librivoxaudio`),
  tocando pelo player `archive.org/embed/<id>`.
- **Gutendex / Projeto Gutenberg**: livros em domínio público, abertos no
  leitor da plataforma (`/api/leitor` baixa o texto e divide em capítulos).
- O filtro de indicação (clássicos, descobertas ou misturar; português primeiro
  ou qualquer idioma) fica no perfil: colunas `estilo_indicacao` e
  `idioma_indicacao` de `user_preferences`.

### 7. Ticketmaster Discovery API — eventos reais
A melhor opção gratuita para **importar eventos automaticamente**.

1. Acesse **developer.ticketmaster.com** e crie a conta.
2. A chave (**Consumer Key**) do Discovery API é liberada automaticamente.
3. Exemplo: `https://app.ticketmaster.com/discovery/v2/events.json?apikey=SUA_CHAVE&countryCode=BR&latlong=-23.55,-46.63&radius=50&unit=km`

- **Custo:** gratuito — cerca de **5.000 chamadas/dia** e **5 req/s**.
- **Honestidade:** a cobertura no Brasil é **parcial** (foco em grandes casas de
  show e turnês). Não substitui a agenda local, mas complementa bem.
- **Variável:** `TICKETMASTER_API_KEY`.

---

## Nível 3 — Exigem aprovação (deixe para depois)

### 8. Bandsintown — shows por artista
- Uso público informal funciona com um `app_id` próprio:
  `https://rest.bandsintown.com/artists/{artista}/events?app_id=SEU_ID`
- **Uso comercial exige autorização** — solicite pelo formulário de parceria
  em `artists.bandsintown.com` (ou contato de suporte).
- **Variável:** `BANDSINTOWN_APP_ID`.

### 9. Songkick
- API gratuita **apenas para uso não comercial**, mediante aprovação manual
  (formulário no site). O tempo de resposta costuma ser longo.

---

## ❌ O que NÃO vale a pena tentar (para descoberta de eventos)

Vale saber para não perder tempo:

- **Eventbrite:** a API **não permite mais buscar eventos públicos de
  terceiros** — o endpoint de busca foi descontinuado. Você só acessa os eventos
  da **sua própria** organização. Só serve se você for o organizador.
- **Sympla:** a API é voltada ao **organizador** (token no painel, em
  *Integrações*) e devolve apenas os **seus** eventos. Não há busca pública.
- **Meetup:** migrou para GraphQL com OAuth e cobrança — não há mais tier
  gratuito prático.

👉 Por isso, hoje o projeto usa **links de busca** para Sympla/Eventbrite: leva o
usuário direto ao resultado no site do parceiro, sem precisar de API.

---

## Onde colocar as chaves

Todas ficam **apenas no servidor** (sem o prefixo `NEXT_PUBLIC_`, para não
vazarem no navegador). Em produção: **Vercel → Settings → Environment
Variables**, depois **Redeploy**.

```bash
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
LASTFM_API_KEY=
YOUTUBE_API_KEY=
TICKETMASTER_API_KEY=
BANDSINTOWN_APP_ID=
```

## Ordem sugerida

| Prioridade | Serviço | Ganho para o app |
| --- | --- | --- |
| 1 | Nominatim + IBGE | Cidade real do usuário e cobertura nacional de municípios |
| 2 | Ticketmaster | Importação automática de eventos reais |
| 3 | Spotify + Last.fm | Música ligada ao evento e recomendação por artista similar |
| 4 | YouTube | Vídeos relacionados (com cache, por causa da cota) |
| 5 | Bandsintown | Shows por artista (depende de autorização) |

## Boas práticas ao integrar

- **Cache no banco**: guarde os resultados (tabela `events`) e revalide de tempos
  em tempos. Evita estourar cota e deixa a home rápida.
- **Nunca no cliente**: as chamadas devem sair de Route Handlers (`app/api/...`),
  nunca do navegador — senão a chave vaza.
- **Degradação suave**: se a API falhar, o app deve continuar mostrando o
  catálogo próprio (é assim que `lib/repo.ts` já funciona hoje).
- **Atribuição**: alguns serviços exigem citar a fonte na interface. Verifique.
