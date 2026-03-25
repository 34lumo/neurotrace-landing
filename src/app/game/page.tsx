'use client';

import { useRouter } from 'next/navigation';
import DarknessExplorer from '@/components/games/DarknessExplorer/DarknessExplorer';
import { getDemoConfig } from '@/lib/session/types';

export default function GamePage() {
  const router = useRouter();
  const config = getDemoConfig();

  return (
    <DarknessExplorer
      patientConfig={config}
      onExit={() => router.push('/')}
    />
  );
}
