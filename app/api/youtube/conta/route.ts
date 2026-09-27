import { youtubeAccount } from '@/lib/youtube-conta';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) { return youtubeAccount(request, 'conta'); }
