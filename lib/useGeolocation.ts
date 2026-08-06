'use client';

import { useCallback, useEffect, useState } from 'react';
import type { LatLng } from './geo';

export type GeoState = 'idle' | 'loading' | 'granted' | 'denied' | 'unsupported';

const CACHE_KEY = 'nexo:geo:v1';

/**
 * Geolocalização do aparelho (smartphone/iPhone) com cache em sessão.
 * `auto` tenta reutilizar a última posição conhecida sem pedir permissão de novo.
 */
export function useGeolocation(auto = true) {
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [state, setState] = useState<GeoState>('idle');

  useEffect(() => {
    if (!auto || typeof window === 'undefined') return;
    try {
      const raw = window.sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.lat === 'number' && typeof parsed?.lng === 'number') {
          setCoords(parsed);
          setState('granted');
        }
      }
    } catch {
      /* cache indisponível */
    }
  }, [auto]);

  const request = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState('unsupported');
      return;
    }
    setState('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(next);
        setState('granted');
        try {
          window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(next));
        } catch {
          /* ignora */
        }
      },
      () => setState('denied'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  }, []);

  return { coords, state, request };
}
