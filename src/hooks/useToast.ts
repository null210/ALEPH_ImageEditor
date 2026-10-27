import { useCallback, useEffect, useRef, useState } from 'react';

export function useToast(durationMs = 3000) {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const show = useCallback(
    (msg: string) => {
      window.clearTimeout(timerRef.current);
      setMessage(msg);
      timerRef.current = window.setTimeout(() => setMessage(null), durationMs);
    },
    [durationMs],
  );

  return { message, show };
}
