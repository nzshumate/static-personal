export const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value))

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = clamp((value - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

export const pulse = (value: number, start: number, peak: number, end: number) => {
  if (value <= start || value >= end) return 0
  return value < peak
    ? smoothstep(start, peak, value)
    : 1 - smoothstep(peak, end, value)
}

export const makeRng = (seed: number) => {
  let state = seed
  return () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}
