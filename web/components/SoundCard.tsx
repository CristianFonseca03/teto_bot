'use client';

import { useState } from 'react';
import { parse } from 'twemoji-parser';
import type { Sound } from '../types';

interface Props {
  sound: Sound;
  token: string;
  apiUrl: string;
}

type PlayState = 'idle' | 'loading' | 'success' | 'error';

function getTwemojiUrl(emoji: string): string | null {
  const parsed = parse(emoji, { assetType: 'svg' });
  return parsed[0]?.url ?? null;
}

export default function SoundCard({ sound, token, apiUrl }: Props) {
  const [state, setState] = useState<PlayState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const twemojiUrl = getTwemojiUrl(sound.emoji);

  async function handlePlay() {
    if (state === 'loading') return;
    setState('loading');
    setErrorMsg('');

    try {
      const res = await fetch(`${apiUrl}/api/soundboard/play`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ soundId: sound.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error ?? 'Error desconocido');
        setState('error');
        setTimeout(() => setState('idle'), 3000);
        return;
      }

      setState('success');
      setTimeout(() => setState('idle'), 1500);
    } catch {
      setErrorMsg('Error de conexión');
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  }

  const cardBg =
    state === 'error' ? '#fde8e8' :
    state === 'success' ? '#e8f5ec' :
    'var(--card-bg)';

  return (
    <div
      onClick={handlePlay}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 20px ${state === 'error' ? '#e74c3c55' : 'var(--card-hover-shadow)'}44`;
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
      title={sound.name}
      style={{
        background: cardBg,
        borderRadius: 14,
        padding: '20px 16px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        cursor: 'pointer',
        transition: 'box-shadow 0.3s ease, transform 0.15s ease',
        userSelect: 'none',
      }}
    >
      <PlayButton state={state} />

      <div style={{ width: 72, height: 72, marginBottom: 12, marginTop: 4 }}>
        {twemojiUrl ? (
          <img
            src={twemojiUrl}
            alt={sound.emoji}
            width={72}
            height={72}
            style={{ objectFit: 'contain' }}
            draggable={false}
          />
        ) : (
          <span style={{ fontSize: 56, lineHeight: 1 }}>{sound.emoji}</span>
        )}
      </div>

      <span style={{
        fontFamily: "'Be Vietnam Pro', sans-serif",
        fontWeight: 500,
        fontSize: 13,
        color: state === 'error' ? 'var(--error)' : 'var(--text)',
        textAlign: 'center',
        lineHeight: 1.3,
      }}>
        {state === 'error' ? errorMsg : sound.name}
      </span>
    </div>
  );
}

function PlayButton({ state }: { state: PlayState }) {
  const bg =
    state === 'loading' ? '#9b7c95' :
    state === 'success' ? 'var(--secondary)' :
    state === 'error' ? 'var(--error)' :
    'var(--primary)';

  return (
    <div style={{
      position: 'absolute',
      top: 10,
      right: 10,
      width: 26,
      height: 26,
      borderRadius: '50%',
      background: bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background 0.2s ease',
    }}>
      {state === 'loading' ? (
        <svg
          width="12" height="12" viewBox="0 0 24 24"
          fill="none" stroke="white" strokeWidth="2.5"
          strokeLinecap="round"
          style={{ animation: 'spin 0.8s linear infinite' }}
        >
          <path d="M12 2a10 10 0 0 1 10 10" />
        </svg>
      ) : state === 'success' ? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="10" height="11" viewBox="0 0 10 11" fill="white">
          <path d="M1 1.5l8 4-8 4V1.5z" />
        </svg>
      )}
    </div>
  );
}
