# Música e contas do YouTube

- Usuários comuns recebem a trilha do YouTube; Spotify e `/api/playlist` são exclusivos do superadmin da plataforma, não de administradores de organizações.
- Sem vínculo com Google, músicas e Shorts vêm dos interesses cadastrados.
- Com vínculo, a seleção prioriza vídeos curtidos e publicações de canais inscritos. Não é o feed privado de recomendações do YouTube (a API não o fornece).
- Música pessoal é filtrada pela categoria Music. Shorts pessoais exigem indicação explícita `#shorts` e duração de até três minutos; duração sozinha não confirma que um vídeo seja Short.
- Os dados pessoais são consultados sem cache compartilhado; cookies cifrados são vinculados ao usuário da plataforma. Desconectar revoga a autorização e apaga o cookie local.
- Seleções da plataforma usam cache de seis horas para música e renovação diária para Shorts. A interface busca atualizações a cada 30 minutos quando visível; músicas em reprodução não são interrompidas.
- O player permanece visível e mantém os controles oficiais. Não há extração de áudio, reprodução oculta ou remoção de anúncios.

## Ativação do OAuth

1. No projeto Google Cloud, ative YouTube Data API v3.
2. Configure a tela de consentimento e uma credencial OAuth do tipo Aplicativo Web.
3. Cadastre exatamente `https://nexo-social.drap.app.br/api/youtube/retorno` como URI de redirecionamento (ou o domínio real de produção).
4. Configure em Production na Vercel: `YOUTUBE_OAUTH_CLIENT_ID`, `YOUTUBE_OAUTH_CLIENT_SECRET` e `YOUTUBE_OAUTH_REDIRECT_URI`. Para cifra use `YOUTUBE_SESSION_SECRET` ou a `SUPABASE_SERVICE_ROLE_KEY` já existente. Nunca use prefixo NEXT_PUBLIC para segredos.
5. O escopo é apenas `https://www.googleapis.com/auth/youtube.readonly`. Publique a tela de consentimento e conclua a verificação do Google aplicável antes de oferecer acesso amplo; o modo de teste limita usuários e pode expirar refresh tokens.
6. Republique e valide com duas contas distintas: conectar, recomendações pessoais, troca de usuário, renovação e desconectar.

Até as credenciais existirem, a interface informa que a conexão de contas está em configuração; a seleção sem vínculo continua disponível.

Referências: https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps e https://developers.google.com/youtube/terms/developer-policies-guide
