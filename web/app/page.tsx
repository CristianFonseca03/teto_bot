'use client';

import { useEffect, useState, Suspense } from 'react';
import type { Sound } from '../types';
import SoundGrid from '../components/SoundGrid';

type Status = 'loading' | 'offline' | 'error' | 'ready';

function parseJwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

function sanitizeApiUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === 'localhost')) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function SoundboardPage() {
  const [status, setStatus] = useState<Status>('loading');
  const [token, setToken] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const t = params.get('token') ?? '';
    const rawApi = params.get('api') ?? '';

    history.replaceState(null, '', window.location.pathname);

    if (!t) {
      setErrorMsg('Enlace inválido. Ejecuta /soundboard en Discord para obtener tu enlace.');
      setStatus('error');
      return;
    }

    const exp = parseJwtExp(t);
    if (exp !== null && Date.now() > exp * 1000) {
      setErrorMsg('El enlace expiró. Ejecuta /soundboard de nuevo para obtener uno nuevo.');
      setStatus('error');
      return;
    }

    const base = sanitizeApiUrl(rawApi) ?? '';
    setToken(t);
    setApiUrl(base);

    fetch(`${base}/api/soundboard/health`)
      .then(res => { if (!res.ok) throw new Error(); return fetch(`${base}/api/soundboard/sounds`); })
      .then(res => res.json())
      .then((data: Sound[]) => { setSounds(data); setStatus('ready'); })
      .catch(() => setStatus('offline'));
  }, []);

  if (status === 'loading') return <Shell><Spinner /></Shell>;
  if (status === 'offline') return <Shell><OfflineScreen /></Shell>;
  if (status === 'error') return <Shell><ErrorScreen msg={errorMsg} /></Shell>;

  return (
    <Shell>
      <h1 style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 700,
        fontSize: 28,
        color: 'var(--primary)',
        marginBottom: 8,
        letterSpacing: '-0.5px',
      }}>
        Soundboard
      </h1>
      <p style={{
        fontFamily: "'Be Vietnam Pro', sans-serif",
        fontSize: 14,
        color: 'var(--text-muted)',
        marginBottom: 32,
      }}>
        Haz clic en un sonido para reproducirlo en tu canal de voz
      </p>
      <SoundGrid sounds={sounds} token={token} apiUrl={apiUrl} />
      <style>{`
        @media (max-width: 600px) {
          .sound-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 340px) {
          .sound-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>{children}</div>;
}

function Spinner() {
  return (
    <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 80, fontSize: 14 }}>
      Cargando...
    </div>
  );
}

function OfflineScreen() {
  return (
    <div style={{ textAlign: 'center', marginTop: 80 }}>
      <div style={{ fontSize: 64, marginBottom: 24 }}>🤖</div>
      <h2 style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 700,
        fontSize: 22,
        color: 'var(--primary)',
        marginBottom: 12,
      }}>
        El bot está offline
      </h2>
      <p style={{
        fontFamily: "'Be Vietnam Pro', sans-serif",
        fontSize: 14,
        color: 'var(--text-muted)',
        lineHeight: 1.6,
        maxWidth: 360,
        margin: '0 auto',
      }}>
        No se pudo conectar con el bot. Asegúrate de que esté encendido y ejecuta{' '}
        <code style={{ background: '#e8d9b0', padding: '2px 6px', borderRadius: 4, fontSize: 13 }}>/soundboard</code>{' '}
        de nuevo para obtener un enlace actualizado.
      </p>
    </div>
  );
}

function ErrorScreen({ msg }: { msg: string }) {
  return (
    <div style={{
      background: '#fde8e8',
      border: '1px solid #f5c6cb',
      borderRadius: 10,
      padding: '16px 20px',
      color: 'var(--error)',
      fontFamily: "'Be Vietnam Pro', sans-serif",
      fontSize: 14,
      lineHeight: 1.5,
      marginTop: 40,
    }}>
      {msg}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <SoundboardPage />
    </Suspense>
  );
}
