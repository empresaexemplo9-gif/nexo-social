import React from 'react';
import type { Metadata } from 'next';
import LoginForm from './LoginForm';
import { INVITE_SITE, inviteImage, inviteMeta } from '@/lib/invite-art';

export function generateMetadata({ searchParams }: { searchParams: { convite?: string } }): Metadata {
  const token = searchParams.convite;
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return { title: 'Entrar — Nexo Social' };
  const { title, description } = inviteMeta(token);
  const images = [{ url: `${INVITE_SITE}${inviteImage(token)}`, width: 1200, height: 630, alt: title }];
  return { title, description, robots: { index: false, follow: false }, referrer: 'no-referrer',
    openGraph: { title, description, images, url: `${INVITE_SITE}/login?cadastro=1&convite=${encodeURIComponent(token)}` },
    twitter: { card: 'summary_large_image', title, description, images } };
}
export default function LoginPage() { return <LoginForm />; }
