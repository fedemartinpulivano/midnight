export const clamp = (v: number, a: number, b: number) =>
  Math.max(a, Math.min(b, v));

/** Normalise `p` inside the window [a, b], clamped at both ends. */
export const seg = (p: number, a: number, b: number) =>
  clamp((p - a) / (b - a), 0, 1);

/** easeInOutCubic — the weight a steel door moves with. */
export const ease = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** How far a sticky section has been scrolled through, 0 → 1. */
export function sectionProgress(el: Element) {
  const r = el.getBoundingClientRect();
  const total = r.height - window.innerHeight;
  return total > 0 ? clamp(-r.top / total, 0, 1) : 1;
}
