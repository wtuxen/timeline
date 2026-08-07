/** Utilidades para derivar tons a partir das cores escolhidas pelo usuário. */

export function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '')
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value
  const int = Number.parseInt(full, 16)
  if (!Number.isFinite(int)) return [100, 116, 139]
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Preto ou branco, o que tiver mais contraste sobre a cor informada. */
export function readableTextOn(hex: string): string {
  const [r, g, b] = hexToRgb(hex)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#0f172a' : '#ffffff'
}

/** Paleta oferecida nos seletores de cor de status e categorias. */
export const PALETTE = [
  '#0ea5e9',
  '#6366f1',
  '#a855f7',
  '#ec4899',
  '#f43f5e',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#64748b',
  '#94a3b8',
]
