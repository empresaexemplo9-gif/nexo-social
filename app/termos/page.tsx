import React from 'react';
import Link from 'next/link';
import { ADMIN_EMAIL } from '@/lib/auth';

export const metadata = {
  title: 'Termos de Serviço — nexo.social',
  description: 'Regras de uso do nexo.social: contas, comunidade, conteúdos, integrações e atendimento.',
};

const secoes = [
  { titulo: '1. Sobre o serviço', texto: 'O nexo.social reúne interesses, recomendações culturais, agenda, leitura, grupos e recursos de comunicação. Estes Termos de Serviço se aplicam ao site e ao aplicativo web. O serviço é administrado pela equipe nexo.social, cujo contato está no final desta página. Recursos disponíveis podem variar conforme a conta, as permissões e a disponibilidade das integrações.' },
  { titulo: '2. Cadastro e utilização', texto: 'Forneça informações corretas e mantenha seus dados de contato atualizados. Ao criar uma conta e utilizar os recursos, observe estes termos e a legislação aplicável. Não se passe por outra pessoa nem cadastre uma organização sem autorização para representá-la. A leitura da Política de Privacidade não constitui consentimento genérico para finalidades opcionais de tratamento de dados.' },
  { titulo: '3. Segurança da conta', texto: 'Proteja sua senha, não compartilhe credenciais e encerre a sessão em aparelhos compartilhados. Informe à administração qualquer suspeita de acesso indevido. As ações realizadas em sua conta serão avaliadas conforme as circunstâncias; estes termos não transferem ao usuário a responsabilidade por falhas de segurança atribuíveis ao serviço.' },
  { titulo: '4. Crianças e adolescentes', texto: 'O serviço não é direcionado a crianças. O uso por menores deve respeitar a capacidade civil, a participação dos responsáveis quando exigida e as proteções legais aplicáveis. É proibido explorar, assediar ou expor crianças e adolescentes a situações de risco. Suspeitas podem ser comunicadas à administração e às autoridades competentes. A proteção de menores prevalece sobre regras de grupos e preferências de outros usuários.' },
  { titulo: '5. Regras da comunidade', texto: 'Trate outras pessoas com respeito. São proibidos ameaças, perseguição, discriminação, incitação à violência, exploração sexual, divulgação não autorizada de conteúdo íntimo, exposição de dados pessoais de terceiros, golpes, spam, malware e violação de direitos autorais. Não burle controles de acesso, tente acessar contas alheias ou prejudique o funcionamento da plataforma. Regras específicas de grupos devem ser compatíveis com estes termos e com a lei. Palavras grotescas e desnecessárias — palavrão pesado, termo sexual explícito e ofensa de ódio (racismo, homofobia, transfobia, capacitismo) — não são aceitas em nenhum espaço da plataforma: o texto não é publicado e a conta de quem o escreveu é banida de forma imediata e permanente, com perda definitiva do acesso. Em caso de engano, a revisão pode ser pedida à administração (item 12).' },
  { titulo: '6. Conteúdo publicado e direitos autorais', texto: 'Você mantém os direitos que possui sobre seus textos, fotos e demais conteúdos. Ao publicá-los, autoriza o nexo.social, de forma não exclusiva e apenas na medida necessária ao serviço, a armazenar, processar e exibir esse conteúdo para o público ou os participantes escolhidos no recurso. Essa autorização não transfere a propriedade nem permite exploração fora dessas finalidades. Publique somente material que você possa compartilhar. Ao excluir conteúdo, sua exibição deve cessar conforme o funcionamento do recurso, ressalvadas retenções legais e cópias já realizadas por terceiros.' },
  { titulo: '7. Grupos, convites e compromissos', texto: 'Respeite as permissões de participação e de convite de cada grupo. Compartilhe links de convite com cuidado: quem os receber poderá tentar ingressar conforme as regras do recurso. Compromissos e respostas dependem das informações fornecidas pelos participantes; confirme detalhes importantes diretamente com eles. Recomendações, eventos e horários podem mudar, por isso confira os dados com o organizador antes de se deslocar ou contratar serviços.' },
  { titulo: '8. Chamadas de áudio e vídeo', texto: 'Chamadas dependem de conexão, compatibilidade do aparelho e permissão para microfone e câmera. Não grave, divulgue nem reutilize a imagem ou a voz de participantes em desacordo com seus direitos e com a legislação. O recurso não substitui serviços de emergência. O funcionamento pode ser afetado por rede, navegador e fornecedores de infraestrutura.' },
  { titulo: '9. Integrações e serviços de terceiros', texto: 'O aplicativo pode exibir players, livros, vídeos, eventos e outros conteúdos de terceiros. Conexões opcionais a contas externas dependem de autorização e podem ser revogadas conforme a Política de Privacidade. Cada fornecedor aplica seus próprios termos. O acesso pelo nexo.social não concede licença para baixar, redistribuir ou explorar conteúdo sem autorização. Links externos não significam endosso, e compras realizadas fora do aplicativo seguem as condições do fornecedor, sem afastar responsabilidades legalmente atribuíveis ao nexo.social.' },
  { titulo: '10. Disponibilidade e alterações de recursos', texto: 'Buscamos manter o serviço disponível e corrigir falhas, mas podem ocorrer interrupções por manutenção, problemas técnicos ou indisponibilidade de terceiros. Mudanças relevantes que afetem o uso devem ser informadas por meios adequados. Não há garantia de disponibilidade contínua ou de que todos os conteúdos permanecerão acessíveis indefinidamente. Nada nesta cláusula exclui garantias e direitos previstos em lei.' },
  { titulo: '11. Preços e contratações', texto: 'Estes termos não criam uma cobrança ou assinatura. Se um recurso pago for oferecido, preço, condições, periodicidade, cancelamento e direitos aplicáveis deverão ser informados antes da contratação e dependerão de uma escolha expressa do usuário. A simples publicação de novos termos não autoriza cobranças.' },
  { titulo: '12. Denúncias, moderação e revisão', texto: 'Envie denúncias à administração com o link ou identificação do conteúdo, o motivo e informações suficientes para análise, evitando dados pessoais desnecessários. Conforme a gravidade e as obrigações legais, conteúdos podem ser restringidos ou removidos e contas podem ser suspensas. Medidas urgentes podem ser necessárias para proteger pessoas e o serviço. O usuário poderá solicitar esclarecimentos e revisão pelo mesmo contato, observadas restrições legais e de segurança. Não envie material ilícito como anexo; informe sua localização para análise adequada.' },
  { titulo: '13. Encerramento da conta', texto: 'Você pode deixar de usar o serviço e solicitar o encerramento da conta à administração. O tratamento e a exclusão de dados seguem a Política de Privacidade e as obrigações legais aplicáveis. Suspensão ou encerramento não retira o direito de solicitar informações, revisão ou atendimento. Quando possível e permitido, a administração informará o motivo de restrições e orientará sobre dados e conteúdos associados à conta.' },
  { titulo: '14. Responsabilidades e direitos', texto: 'Cada parte responde por suas ações e obrigações nos limites da legislação. O usuário deve respeitar direitos de terceiros e utilizar o aplicativo licitamente. O nexo.social permanece responsável pelo que a lei lhe atribuir. Estes termos não excluem indenizações legalmente devidas, direitos do consumidor, acesso à Justiça ou proteção de dados pessoais, nem impõem renúncia a direitos indisponíveis.' },
  { titulo: '15. Atualizações dos termos', texto: 'A versão vigente e sua data ficam disponíveis nesta página. Alterações relevantes devem ser comunicadas de forma adequada; quando uma nova manifestação de vontade for necessária, ela deverá ser solicitada. Mudanças não autorizam aplicação retroativa prejudicial a direitos já constituídos. Em caso de dúvida ou discordância, entre em contato para esclarecimentos e opções de encerramento.' },
  { titulo: '16. Legislação e solução de conflitos', texto: 'Aplicam-se as leis brasileiras, incluindo o Marco Civil da Internet, a LGPD e, quando cabível, o Código de Defesa do Consumidor. Procure o atendimento para tentar resolver questões sobre o serviço. Isso não limita o acesso a autoridades administrativas ou ao Poder Judiciário. Será respeitado o foro legalmente competente, inclusive o do domicílio do consumidor quando aplicável.' },
];

export default function TermosPage() {
  return (
    <div className="tela-sem-barra min-h-screen font-sans text-zinc-100 antialiased">
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <nav aria-label="Documentos do aplicativo" className="mb-8 flex flex-wrap gap-5 text-sm">
          <Link href="/login" className="underline">nexo.social · Entrar</Link>
          <Link href="/privacidade" className="underline">Política de Privacidade</Link>
        </nav>
        <header className="mb-10 border-b border-zinc-800 pb-8">
          <p className="font-mono text-xs uppercase tracking-widest text-emerald-400">Regras do aplicativo</p>
          <h1 className="mt-3 text-4xl font-bold text-zinc-50 sm:text-5xl">Termos de Serviço</h1>
          <p className="mt-4 text-sm text-zinc-400">Versão 1.1 · Atualização: 1º de outubro de 2026.</p>
          <p className="mt-4 leading-relaxed text-zinc-300">Conheça as condições para usar o nexo.social e participar da comunidade. Consulte também nossa <Link className="underline" href="/privacidade">Política de Privacidade</Link>.</p>
        </header>
        <div className="space-y-8 text-sm leading-relaxed text-zinc-300">
          {secoes.map(secao => <section key={secao.titulo}>
            <h2 className="mb-3 text-xl font-semibold text-zinc-50">{secao.titulo}</h2>
            <p>{secao.texto}</p>
          </section>)}
          <section className="rounded-2xl border border-emerald-800/50 bg-emerald-950/20 p-5">
            <h2 className="mb-3 text-xl font-semibold text-zinc-50">17. Atendimento</h2>
            <p>Para dúvidas, denúncias, revisão de decisões ou encerramento da conta, fale com a administração do nexo.social: <a className="break-all underline" href={`mailto:${ADMIN_EMAIL}?subject=Atendimento%20nexo.social`}>{ADMIN_EMAIL}</a>. Nunca envie sua senha.</p>
          </section>
        </div>
        <footer className="mt-12 border-t border-zinc-800 pt-6 text-sm">
          <Link href="/privacidade" className="underline">Política de Privacidade</Link>
        </footer>
      </main>
    </div>
  );
}
