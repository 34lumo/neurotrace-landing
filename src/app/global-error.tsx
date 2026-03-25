'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ background: '#000', color: '#fff', fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#f87171', marginBottom: 16 }}>Algo salió mal.</p>
          <button onClick={reset} style={{ padding: '8px 20px', background: '#38bdf8', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#000', fontWeight: 600 }}>
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
