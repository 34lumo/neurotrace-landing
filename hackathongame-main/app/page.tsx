'use client';

import { useActionState, useEffect } from 'react';
import { signInAsDemo, type AuthActionState } from './actions/auth';

export default function Home() {
  const [state, formAction, isPending] = useActionState<AuthActionState, FormData>(
    async () => {
      return await signInAsDemo();
    },
    null,
  );

  useEffect(() => {
    if (state?.error) {
      console.error('Demo login error:', state.error);
    }
  }, [state]);

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--bg-deep)' }}
    >
      <div className="absolute pointer-events-none" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
        <div
          className="rounded-full animate-pulse-glow"
          style={{
            width: 500,
            height: 500,
            background: 'radial-gradient(circle, rgba(56,189,248,0.08) 0%, rgba(56,189,248,0.03) 40%, transparent 70%)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 300,
            height: 300,
            background: 'radial-gradient(circle, rgba(167,139,250,0.06) 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md px-6 text-center">
        <div className="animate-fade-in-up mb-10">
          <h1
            className="text-5xl font-bold tracking-tight mb-2"
            style={{
              background: 'linear-gradient(135deg, #38bdf8, #a78bfa, #38bdf8)',
              backgroundSize: '200% 200%',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'shimmer 4s ease-in-out infinite',
            }}
          >
            Darkness Explorer
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Rehabilitación neuromotora post-ictus
          </p>
        </div>

        <form action={formAction} className="animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          <button
            type="submit"
            disabled={isPending}
            className="btn-primary w-full text-lg py-4 disabled:opacity-60"
          >
            {isPending ? 'Conectando...' : 'Jugar como Ana'}
          </button>

          {state?.error && (
            <p className="mt-4 text-sm" style={{ color: 'var(--danger)' }}>
              {state.error}
            </p>
          )}

          <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
            Se requiere webcam para eye-tracking. Sin webcam, se usará el ratón.
          </p>
        </form>

        <a
          href="/dashboard"
          className="inline-block mt-6 text-sm transition-colors hover:underline animate-fade-in-up"
          style={{ color: 'var(--text-secondary)', animationDelay: '0.3s' }}
        >
          Ver Dashboard de sesiones →
        </a>
      </div>
    </div>
  );
}
