'use client';

import { useRouter } from 'next/navigation';
import DarknessExplorer from '@/components/games/DarknessExplorer/DarknessExplorer';
import { getDemoConfig } from '@/lib/session/types';

interface GameWrapperProps {
  sessionId: string;
}

export default function GameWrapper({ sessionId }: GameWrapperProps) {
  const router = useRouter();
  const config = getDemoConfig();

  return (
    <DarknessExplorer
      patientConfig={config}
      sessionId={sessionId}
      onExit={() => router.push('/')}
      onViewDashboard={() => router.push('/dashboard')}
    />
  );
}
