import Colecionaveis, { type AbaDosColecionaveis } from '@/components/colecionaveis/Colecionaveis';

export const metadata = { title: 'Colecionáveis — nexo.social' };

const ABAS: AbaDosColecionaveis[] = ['adesivos', 'bottons', 'fundos', 'missoes', 'trocas'];

export default function ColecionaveisPage({ searchParams }: { searchParams: { aba?: string } }) {
  const aba = ABAS.find((a) => a === searchParams.aba) ?? 'adesivos';
  return <Colecionaveis abaInicial={aba} />;
}
