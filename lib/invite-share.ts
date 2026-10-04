import { inviteEdition, inviteImage, inviteMeta } from './invite-art';

export function inviteShareData(link: string): ShareData {
  const token = new URL(link).pathname.split('/').pop() || '';
  const e = inviteEdition(token);
  const { title } = inviteMeta(token);
  return {
    title,
    text: `Separei um convite do Nexo Social pra você: ${e.theme.nome}, ${e.serialLabel}. Só existe um desse.`,
    url: link,
  };
}

export async function inviteShareFile(link: string): Promise<File> {
  const token = new URL(link).pathname.split('/').pop() || '';
  const response = await fetch(inviteImage(token));
  if (!response.ok) throw new Error('Não foi possível carregar a arte do convite.');
  const image = await response.blob();
  if (image.type !== 'image/png' || !image.size) throw new Error('A arte do convite está indisponível.');
  const { serial } = inviteEdition(token);
  return new File([image], `nexo-social-convite-${String(serial).padStart(4, '0')}.png`, { type: image.type });
}

// Recebe a imagem já carregada: a janela de compartilhamento abre durante o
// clique, preservando a ativação exigida pelo navegador para enviar arquivos.
export function shareInvite(link: string, file?: File) {
  if (file && navigator.canShare?.({ files: [file] })) {
    const { title, text } = inviteShareData(link);
    return navigator.share({ title, text: `${text}\n${link}`, files: [file] });
  }
  return navigator.share(inviteShareData(link));
}
