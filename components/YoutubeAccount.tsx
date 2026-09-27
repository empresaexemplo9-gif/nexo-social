'use client';
import React, { useEffect, useState } from 'react';

export default function YoutubeAccount() {
  const [account, setAccount] = useState<{configurado:boolean;conectado:boolean} | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/youtube/conta',{cache:'no-store',signal:controller.signal}).then(r=>r.ok?r.json():null).then(setAccount).catch(()=>{});
    const url = new URL(window.location.href);
    const result = url.searchParams.get('youtube');
    if (result) {
      setMessage(result === 'conectado' ? 'Conta conectada. Suas curtidas e inscrições terão prioridade.' : result === 'cancelado' ? 'Conexão cancelada.' : 'Não foi possível conectar sua conta. Tente novamente mais tarde.');
      url.searchParams.delete('youtube'); window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash);
    }
    return ()=>controller.abort();
  },[]);
  async function disconnect() {
    setBusy(true);
    try {
      const r = await fetch('/api/youtube/sair',{method:'POST'});
      if (!r.ok) throw Error('Não foi possível desconectar. Tente novamente.');
      window.location.reload();
    } catch(e) {setMessage((e as Error).message);setBusy(false);}
  }
  return <div className="card-soft space-y-2 p-4 text-sm">
    <p>{account?.conectado ? 'YouTube conectado: suas curtidas e canais inscritos têm prioridade.' : 'Sem conta conectada, as indicações seguem os interesses do seu perfil.'}</p>
    <p className="text-xs text-zinc-400">A seleção é feita pela nexo.social. Não é uma cópia do feed de recomendações do YouTube.</p>
    {account?.conectado ? <button disabled={busy} type="button" onClick={()=>void disconnect()} className="action-collage rounded-lg border px-3 py-2">Desconectar YouTube</button>
      : account?.configurado ? <a href="/api/youtube/entrar" className="action-collage inline-block rounded-lg border px-3 py-2">Conectar minha conta do YouTube</a>
      : account && <p className="text-xs text-zinc-400">A conexão de contas do YouTube ainda está em configuração. Sua trilha da plataforma continua disponível.</p>}
    {message && <p role="status">{message}</p>}
  </div>;
}
