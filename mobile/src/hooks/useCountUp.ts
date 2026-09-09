import { useEffect, useRef, useState } from 'react';

/** Szám felpörgetése ease-out cubic görbével (design: 900 ms). */
export function useCountUp(target: number, ms = 900, enabled = true): number {
  const [value, setValue] = useState(enabled ? 0 : target);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (!enabled) {
      setValue(target);
      return;
    }
    const start = Date.now();
    const from = 0;
    const step = () => {
      const t = Math.min(1, (Date.now() - start) / ms);
      const e = 1 - Math.pow(1 - t, 3);
      setValue(from + (target - from) * e);
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
  }, [target, ms, enabled]);
  return value;
}
