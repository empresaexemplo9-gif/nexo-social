import { redirect } from 'next/navigation';

/** O endereço antigo dos itens exclusivos: agora é a aba Colecionáveis. */
export default function Exclusivos() {
  redirect('/colecionaveis');
}
