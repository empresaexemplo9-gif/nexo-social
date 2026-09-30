# YouTube no nexo-social

O Client ID deve corresponder ao cliente Web do projeto Google autorizado e ao seu segredo. Ele não é uma API key e não basta para autorizar contas.

Para ativar no projeto Vercel nexo-social:
1. No projeto Google desse Client ID, habilite YouTube Data API v3.
2. Configure o cliente OAuth como aplicativo Web, tela de consentimento e escopo youtube.readonly. Em teste, cadastre os usuários autorizados; para acesso público, conclua a publicação/verificação exigida pelo Google.
3. Autorize exatamente https://nexo-social.drap.app.br/api/youtube/retorno como URI de redirecionamento (inclua outro domínio apenas se for usado pela plataforma).
4. Cadastre YOUTUBE_OAUTH_CLIENT_SECRET e YOUTUBE_SESSION_SECRET (segredo aleatório de pelo menos 32 bytes) somente nas variáveis privadas da Vercel. Nunca em NEXT_PUBLIC ou no Git. Opcional: YOUTUBE_OAUTH_CLIENT_ID e YOUTUBE_OAUTH_REDIRECT_URI.
5. Faça novo deploy e teste Entrar com YouTube, consentimento, retorno à plataforma, Shorts das inscrições e Desconectar.

O OAuth usa state, PKCE, cookies HttpOnly criptografados e vínculo ao ID da conta da plataforma. Com refresh token, a sessão pode durar até 180 dias neste navegador, com renovação de access token. Não replica a sessão nos demais aparelhos. Não autentica o iframe do YouTube nem remove restrições de reprodução.

O feed prioriza Shorts identificados nas curtidas e nos vídeos recentes de três das 50 inscrições por rodada e completa com interesses. Não acessa o histórico de exibição nem o algoritmo privado do YouTube. O histórico local guarda até 2.000 vídeos efetivamente exibidos, separado por usuário; limpar os dados do navegador remove esse histórico. Respostas com dados de conta usam no-store.

O futebol consulta páginas públicas dos canais oficiais CazéTV, ge tv e GOAT, confirma metadados do vídeo e atualiza a cada minuto. Se o YouTube limitar consultas ou proibir incorporação, o painel informa a limitação e oferece o canal oficial. Nem toda partida tem transmissão gratuita disponível.

Documentação: https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps
Inscrições: https://developers.google.com/youtube/v3/docs/subscriptions/list
