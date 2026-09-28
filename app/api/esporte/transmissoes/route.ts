import { NextResponse } from 'next/server';
import { footballBroadcasts } from '@/lib/football-live';
export const dynamic = 'force-dynamic';
export async function GET() {
  return NextResponse.json(await footballBroadcasts(), { headers: { 'Cache-Control': 'public, s-maxage=60, must-revalidate' } });
}

export const maxDuration = 30;
