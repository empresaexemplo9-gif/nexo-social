import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-helpers';
import { createAdminClient } from '@/lib/supabase-server';
import {
  PROVIDERS,
  getProvider,
  missingEnv,
  testProvider,
  importTicketmaster,
  importTicketPlatform,
  type ProviderId,
} from '@/lib/integrations';
import { cityCoords } from '@/lib/data';

export const dynamic = 'force-dynamic';

/** Situação de todas as integrações (sem expor nenhuma chave). */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  return NextResponse.json({
    providers: PROVIDERS.map((p) => {
      const missing = missingEnv(p);
      return {
        id: p.id,
        label: p.label,
        kind: p.kind,
        purpose: p.purpose,
        docsUrl: p.docsUrl,
        caveat: p.caveat,
        canImport: Boolean(p.canImport),
        envVars: p.envVars,
        missingEnv: missing,
        // "pronto" = não faltam credenciais (o teste confirma se funciona)
        ready: missing.length === 0,
      };
    }),
  });
}

/** Ações: testar conexão e importar eventos. */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const providerId = body?.provider as ProviderId | undefined;
  const action = (body?.action as string) || 'test';

  const def = providerId ? getProvider(providerId) : undefined;
  if (!def) {
    return NextResponse.json({ error: 'Provedor inválido.' }, { status: 400 });
  }

  if (action === 'test') {
    const result = await testProvider(def.id);
    return NextResponse.json({ provider: def.id, action, result });
  }

  if (action === 'import') {
    if (!def.canImport) {
      return NextResponse.json({ error: `${def.label} não suporta importação.` }, { status: 400 });
    }
    // Grava com service role para não esbarrar no RLS; cai para o cliente do admin.
    const sb = createAdminClient() ?? auth.sb;
    const city = typeof body?.city === 'string' && body.city ? body.city : undefined;
    const coords = city ? cityCoords(city) : null;

    if (def.id === 'sympla' || def.id === 'eventbrite') {
      const r = await importTicketPlatform(sb, def.id);
      return NextResponse.json({ provider: def.id, action, result: r }, { status: r.ok ? 200 : 502 });
    }

    const result = await importTicketmaster(sb, {
      city,
      lat: coords?.lat,
      lng: coords?.lng,
      radiusKm: Number(body?.radiusKm) || 100,
      size: Math.min(Number(body?.size) || 50, 100),
    });
    return NextResponse.json({ provider: def.id, action, result }, { status: result.ok ? 200 : 502 });
  }

  return NextResponse.json({ error: `Ação desconhecida: ${action}` }, { status: 400 });
}
