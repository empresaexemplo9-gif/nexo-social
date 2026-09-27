import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'Política de Privacidade — nexo.social',
  description: 'Saiba como o nexo.social coleta, usa, armazena e protege seus dados pessoais.',
};

const secoes = [
  {
    titulo: '1. Quem somos',
    conteudo: (
      <p>
        O <strong>nexo.social</strong> é uma plataforma de cultura, interesses, agenda e comunidade. Esta Política de
        Privacidade explica como tratamos os dados pessoais utilizados para oferecer o serviço e se aplica ao site,
        aplicativo web e recursos acessíveis em <a href="https://nexo-social-two.vercel.app" className="text-emerald-400 underline">nexo-social-two.vercel.app</a>.
      </p>
    ),
  },
  {
    titulo: '2. Dados que podemos coletar',
    conteudo: (
      <ul className="list-disc space-y-2 pl-5">
        <li><strong>Cadastro e autenticação:</strong> e-mail, identificador da conta e informações necessárias para manter sua sessão.</li>
        <li><strong>Perfil:</strong> nome, foto, tipo de conta, organização/tenant e outras informações que você escolher fornecer.</li>
        <li><strong>Preferências:</strong> interesses, cidade, raio de eventos, frequência de curadoria e configurações da sua home.</li>
        <li><strong>Conteúdo criado por você:</strong> compromissos, convites, grupos, publicações, comentários, imagens e interações na comunidade.</li>
        <li><strong>Newsletter:</strong> endereço de e-mail, frequência escolhida e registros necessários para administrar a inscrição.</li>
        <li><strong>Dados técnicos:</strong> endereço IP, navegador, dispositivo, logs, data/hora de acesso e informações necessárias para segurança, diagnóstico e funcionamento do serviço.</li>
      </ul>
    ),
  },
  {
    titulo: '3. Como usamos os dados',
    conteudo: (
      <ul className="list-disc space-y-2 pl-5">
        <li>criar e proteger sua conta, autenticar acessos e manter a sessão;</li>
        <li>salvar suas preferências e personalizar conteúdos, recomendações e agenda;</li>
        <li>permitir recursos sociais, como grupos, convites, publicações e notificações;</li>
        <li>enviar a curadoria quando você solicitar, inclusive por newsletter;</li>
        <li>operar, manter, medir, corrigir e melhorar a plataforma;</li>
        <li>prevenir fraude, abuso, acessos indevidos e incidentes de segurança; e</li>
        <li>cumprir obrigações legais e responder a solicitações legítimas de autoridades.</li>
      </ul>
    ),
  },
  {
    titulo: '4. Bases legais',
    conteudo: (
      <p>
        Tratamos dados conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), especialmente para execução do
        contrato ou de procedimentos preliminares, cumprimento de obrigação legal, exercício regular de direitos,
        legítimo interesse e, quando aplicável, consentimento. Quando o tratamento depender de consentimento, você poderá
        revogá-lo sem afetar os tratamentos anteriores.
      </p>
    ),
  },
  {
    titulo: '5. Compartilhamento e operadores',
    conteudo: (
      <p>
        Não vendemos dados pessoais. Podemos compartilhar o mínimo necessário com fornecedores que hospedam, autenticam,
        armazenam ou ajudam a operar o serviço, sempre conforme suas funções e instruções. O nexo.social utiliza serviços
        de infraestrutura e banco de dados, como o Supabase, e pode carregar conteúdo de terceiros, como YouTube e sites
        de eventos. Esses serviços possuem suas próprias políticas e podem tratar dados diretamente quando você os acessa.
        Também poderemos compartilhar dados quando exigido por lei ou para proteger direitos, segurança e integridade da
        plataforma.
      </p>
    ),
  },
  {
    titulo: '6. Conteúdo público e comunidade',
    conteudo: (
      <p>
        Publicações, nome, foto e informações inseridas em grupos ou áreas públicas podem ser visualizados por outros
        usuários, conforme a funcionalidade e as configurações de privacidade escolhidas. Não publique dados sensíveis ou
        informações de terceiros sem autorização. Grupos fechados restringem o acesso conforme as regras do recurso, mas
        nenhum serviço conectado à internet oferece garantia absoluta de confidencialidade.
      </p>
    ),
  },
  {
    titulo: '7. Cookies e armazenamento local',
    conteudo: (
      <p>
        Usamos cookies, armazenamento local e tecnologias semelhantes para manter sessões, lembrar preferências, habilitar
        a instalação do aplicativo e garantir o funcionamento. Você pode bloquear ou apagar essas tecnologias no navegador,
        mas algumas funções podem deixar de funcionar. Não usamos cookies para vender publicidade comportamental.
      </p>
    ),
  },
  {
    titulo: '8. Retenção e segurança',
    conteudo: (
      <p>
        Mantemos os dados pelo tempo necessário para cumprir as finalidades desta política, atender obrigações legais,
        resolver disputas e proteger a plataforma. Adotamos medidas técnicas e administrativas razoáveis, como controles
        de acesso, autenticação e regras de segurança do provedor. Ainda assim, não é possível garantir segurança absoluta
        na transmissão ou no armazenamento de informações.
      </p>
    ),
  },
  {
    titulo: '9. Seus direitos',
    conteudo: (
      <p>
        Nos termos da LGPD, você pode solicitar confirmação e acesso, correção, anonimização, bloqueio ou eliminação de
        dados desnecessários, portabilidade quando regulamentada, informação sobre compartilhamentos, revogação do
        consentimento e revisão de decisões automatizadas, quando aplicável. Para solicitar atendimento, use o canal de
        suporte indicado no aplicativo ou no repositório oficial do projeto. Podemos pedir informações para confirmar sua
        identidade e manter registros da solicitação.
      </p>
    ),
  },
  {
    titulo: '10. Crianças e adolescentes',
    conteudo: (
      <p>
        O serviço não é direcionado deliberadamente a crianças. Se você identificar que uma criança forneceu dados pessoais
        sem a autorização adequada, solicite a remoção pelo canal de suporte indicado acima.
      </p>
    ),
  },
  {
    titulo: '11. Alterações e contato',
    conteudo: (
      <p>
        Podemos atualizar esta política para refletir mudanças no serviço, na legislação ou nas práticas de tratamento.
        Publicaremos a versão atualizada nesta página e alteraremos a data abaixo. Dúvidas, solicitações e comunicações
        sobre privacidade devem ser encaminhadas pelo canal de suporte indicado no aplicativo ou no repositório oficial.
      </p>
    ),
  },
];

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen font-sans text-zinc-100 antialiased">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <nav className="mb-8 text-xs text-zinc-500">
          <Link href="/" className="hover:text-zinc-100">Início</Link>
          <span className="mx-2">/</span>
          <span>Privacidade</span>
        </nav>
        <header className="mb-10 border-b border-zinc-800 pb-8">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-400">Documento legal</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-50 md:text-5xl">Política de Privacidade</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Última atualização: 27 de setembro de 2026. Leia como o nexo.social trata seus dados pessoais.
          </p>
        </header>
        <div className="space-y-8 text-sm leading-relaxed text-zinc-300">
          {secoes.map((secao) => (
            <section key={secao.titulo}>
              <h2 className="mb-3 text-xl font-semibold text-zinc-50">{secao.titulo}</h2>
              {secao.conteudo}
            </section>
          ))}
        </div>
        <div className="mt-12 rounded-2xl border border-emerald-800/50 bg-emerald-950/20 p-5 text-sm text-emerald-200">
          Esta política é um modelo informativo e deve ser revisada pelo responsável jurídico do serviço antes da publicação definitiva.
        </div>
      </main>
      <footer className="border-t border-zinc-900 py-8 text-center text-xs text-zinc-500">
        <Link href="/" className="hover:text-zinc-300">nexo.social</Link>
        <span className="mx-2">•</span>
        <span>Política de Privacidade</span>
      </footer>
    </div>
  );
}
