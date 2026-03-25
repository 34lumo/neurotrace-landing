'use client';

import { useEffect } from 'react';

export default function GameError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Game error]', error);
  }, [error]);

  return (
    <div style={{ background: '#050508', color: '#e2e8f0', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#94a3b8', marginBottom: 16 }}>Error al cargar el juego.</p>
        <button onClick={reset} style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#38bdf8,#2563eb)', border: 'none', borderRadius: 12, cursor: 'pointer', color: '#fff', fontWeight: 600 }}>
          Reintentar
        </button>
      </div>
    </div>
  );
}
