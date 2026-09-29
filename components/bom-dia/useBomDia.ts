'use client';
import { useEffect, useState } from 'react';
import { dayKey, selectBomDia, type DietFilter } from '@/lib/bom-dia';

export function useBomDia(initialDay = '', initialRound = 0) {
  const [day, setDay] = useState(initialDay);
  const [round, setRound] = useState(initialRound);
  const [diet, setDiet] = useState<DietFilter>('todas');
  useEffect(() => {
    const refreshDay = () => {
      if (document.hidden) return;
      const today = dayKey();
      if (today !== day) { setDay(today); setRound(0); }
    };
    refreshDay();
    const timer = setInterval(refreshDay, 60_000);
    window.addEventListener('focus', refreshDay);
    document.addEventListener('visibilitychange', refreshDay);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refreshDay);
      document.removeEventListener('visibilitychange', refreshDay);
    };
  }, [day]);
  return { day, round, diet, setDiet, next: () => setRound(r => r + 1),
    selection: selectBomDia(day || '2026-01-01', round, diet) };
}
