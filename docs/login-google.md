# Login e cadastro

A autenticação usa o projeto Supabase existente `srunjulrflvsbrkhllaf` e suas tabelas, políticas RLS e função `ensure_my_profile`. O primeiro acesso Google cria uma conta pessoal; usuários existentes preservam seu perfil. O cadastro por senha preserva a confirmação de e-mail do Supabase, sem `admin.createUser` nem confirmação artificial de titularidade.

## Configuração de produção

1. No Google Cloud, use um cliente OAuth do tipo Web. Cadastre como URI de retorno `https://srunjulrflvsbrkhllaf.supabase.co/auth/v1/callback`.
2. No Supabase desse projeto, em Authentication → Sign In / Providers → Google, habilite o provedor e preencha Client ID e Client Secret. O segredo fica somente no Supabase, nunca no código ou em variáveis públicas.
3. Em URL Configuration, use `https://nexo-social-two.vercel.app` como Site URL e autorize `https://nexo-social-two.vercel.app/auth/callback` (e o mesmo caminho com query de destino). Para destinos com query, use `https://nexo-social-two.vercel.app/auth/callback**`, sem liberar domínios arbitrários.
4. Mantenha a confirmação de e-mail habilitada. Configure SMTP para enviar confirmação a usuários reais; o serviço padrão tem restrições e limites. O template de confirmação deve usar `{{ .ConfirmationURL }}`. O link deve ser aberto no navegador em que o cadastro foi iniciado (PKCE).
5. Para login Google público, configure a audiência do aplicativo Google para os usuários pretendidos; enquanto estiver em teste, apenas os usuários de teste autorizados poderão entrar.

O retorno `/auth/callback` é público, troca o código PKCE por uma sessão em cookies, valida a identidade e prepara o perfil no banco. Somente depois redireciona para um destino interno validado. As demais rotas continuam protegidas.

## Validação

Execute `node --test tests/auth-flow.test.cjs tests/access-control.test.cjs` e `pnpm build`. Em produção, teste uma conta existente, uma conta nova Google, cancelamento do consentimento e cadastro por e-mail com confirmação. Build e testes simulados não comprovam a configuração do provedor ou entrega de e-mail.

Referência: https://supabase.com/docs/guides/auth/social-login/auth-google
