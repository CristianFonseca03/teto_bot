'use client';

import type { Sound } from '../types';
import SoundCard from './SoundCard';

interface Props {
  sounds: Sound[];
  token: string;
  apiUrl: string;
}

export default function SoundGrid({ sounds, token, apiUrl }: Props) {
  return (
    <div
      className="sound-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
      }}
    >
      {sounds.map(sound => (
        <SoundCard key={sound.id} sound={sound} token={token} apiUrl={apiUrl} />
      ))}
    </div>
  );
}
