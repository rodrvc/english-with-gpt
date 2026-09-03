import { useEffect, useState } from 'react';

/** Segundos restantes del temporizador informativo (nunca fuerza el envío). */
export function useCountdown(startedAt: string, limitSeconds: number, running: boolean): number {
  const compute = () => Math.max(0, limitSeconds - Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const [remaining, setRemaining] = useState(compute);
  useEffect(() => {
    setRemaining(compute());
    if (!running) return;
    const id = window.setInterval(() => setRemaining(compute()), 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt, limitSeconds, running]);
  return remaining;
}
