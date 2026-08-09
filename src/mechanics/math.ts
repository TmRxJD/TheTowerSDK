/** Shared numeric helpers mirroring in-game double/float behavior. */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Linear interpolation: t=0 at `from`, t=1 at `to`. */
export function inverseLerp(value: number, from: number, to: number): number {
  if (from === to) return value >= to ? 1 : 0
  return clamp((value - from) / (to - from), 0, 1)
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

/** Mirrors C# double arithmetic: keep finite products, clamp overflow like IEEE 754. */
export function safeMul(a: number, b: number): number {
  const product = a * b
  return Number.isFinite(product) ? product : Number.MAX_VALUE
}

/** Uniform random in [0, 1) — use only for documenting RNG gates, not simulation. */
export function uniformRoll(): number {
  return Math.random()
}
