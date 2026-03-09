/**
 * Boeing 737 MAX EFIS Animation Constants
 *
 * All animations: fast (150-300ms), ease-out curves, no spring physics.
 * Cockpit instruments respond instantly — precision over playfulness.
 *
 * Color language: Green=done/good, Amber=warning/waiting, Cyan=active, White=data
 */

import { useState, useEffect, useRef, useCallback } from "react";

/* ─── Easing Curves ─── */
export const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];
export const EASE_OUT: [number, number, number, number] = [0, 0, 0.2, 1];

/* ─── Timing (seconds) ─── */
export const T = {
  click: 0.1,
  fast: 0.15,
  normal: 0.2,
  smooth: 0.3,
  panel: 0.4,
  gauge: 0.8,
  glow: 2,
  scan: 0.4,
} as const;

/* ─── Stagger Delays (seconds) ─── */
export const STAGGER = {
  fast: 0.05,
  row: 0.05,
  panel: 0.2,
  gauge: 0.15,
} as const;

/* ─── CSS Custom Properties for Cockpit Colors ─── */
export const COCKPIT_CSS_VARS: Record<string, string> = {
  "--cockpit-green": "#34d399",
  "--cockpit-amber": "#fbbf24",
  "--cockpit-cyan": "#22d3ee",
  "--cockpit-red": "#f87171",
  "--cockpit-white": "#e0d8c8",
};

/* ─── Reduced Motion Check ─── */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return reduced;
}

/* ─── Animated Number Counter (ease-out cubic, no spring) ─── */
export function useCountUp(
  target: number,
  duration: number,
  ready: boolean
): number {
  const [val, setVal] = useState(0);
  const prevRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!ready) return;
    const from = prevRef.current;
    const to = target;
    if (from === to) return;

    const start = performance.now();
    const dur = duration * 1000;

    function tick(now: number) {
      const elapsed = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      const current = Math.round(from + (to - from) * eased);
      setVal(current);
      if (elapsed < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = to;
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, ready]);

  return val;
}

/* ─── One-shot animation trigger ─── */
export function useOneShot(delayMs: number): boolean {
  const [fired, setFired] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFired(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);
  return fired;
}

/* ─── Delayed boolean (for staggered mount) ─── */
export function useDelayedTrue(delayMs: number): boolean {
  const [val, setVal] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVal(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);
  return val;
}

/* ─── Flash state (fires once, auto-resets) ─── */
export function useFlash(durationMs = 300): [boolean, () => void] {
  const [active, setActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const fire = useCallback(() => {
    setActive(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setActive(false), durationMs);
  }, [durationMs]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return [active, fire];
}

/* ─── CSS transition shorthand ─── */
export function cssT(
  props: string | string[],
  duration = T.fast
): string {
  const p = Array.isArray(props) ? props : [props];
  return p
    .map((prop) => `${prop} ${duration * 1000}ms cubic-bezier(0.4, 0, 0.2, 1)`)
    .join(", ");
}
