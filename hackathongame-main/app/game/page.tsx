import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { startSession } from '@/app/actions/session';
import GameWrapper from './GameWrapper';

export default async function GamePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const result = await startSession(5, true);

  if (!result.ok) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-deep)', color: 'var(--text-primary)' }}>
        <div className="text-center">
          <p className="text-lg mb-4">Error al iniciar sesión de juego</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{result.error}</p>
        </div>
      </div>
    );
  }

  return <GameWrapper sessionId={result.sessionId} />;
}
