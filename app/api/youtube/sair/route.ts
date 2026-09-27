import { youtubeAccount } from '@/lib/youtube-conta';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) { return youtubeAccount(request, 'sair'); }
