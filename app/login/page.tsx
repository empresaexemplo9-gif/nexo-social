import React from 'react';
import type { Metadata } from 'next';
import LoginForm from './LoginForm';
import { INVITE_TITLE, INVITE_DESCRIPTION, INVITE_SITE, inviteImage } from '@/lib/invite-art';

export function generateMetadata({ searchParams }: { searchParams: { convite?: string } }): Metadata {
  const token = searchParams.convite;
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return { title: 'Entrar — Nexo Social' };
  const images = [{ url: `${INVITE_SITE}${inviteImage(token)}`, width: 1200, height: 630, alt: INVITE_TITLE }];
  return { title: INVITE_TITLE, description: INVITE_DESCRIPTION, robots: { index: false, follow: false }, referrer: 'no-referrer',
    openGraph: { title: INVITE_TITLE, description: INVITE_DESCRIPTION, images, url: `${INVITE_SITE}/login?cadastro=1&convite=${encodeURIComponent(token)}` },
    twitter: { card: 'summary_large_image', title: INVITE_TITLE, description: INVITE_DESCRIPTION, images } };
}
export default function LoginPage() { return <LoginForm />; }
