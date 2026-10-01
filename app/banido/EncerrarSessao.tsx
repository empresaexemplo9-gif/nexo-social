'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/** Encerra a sessão neste aparelho: a conta banida não volta a entrar. */
export default function EncerrarSessao() {
  useEffect(() => {
    void supabase?.auth.signOut().catch(() => undefined);
  }, []);
  return null;
}
