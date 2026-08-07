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

/**
 * Texto legível sobre a cor informada, usando os extremos do Catppuccin
 * (crust do Mocha para fundos claros, base do Latte para fundos escuros).
 */
export function readableTextOn(hex: string): string {
  const [r, g, b] = hexToRgb(hex)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#11111b' : '#eff1f5'
}

/**
 * Paleta oferecida nos seletores de cor de status e categorias: os acentos do
 * Catppuccin Latte mais dois neutros. Como a cor escolhida fica salva na base e
 * vale para os dois temas, os tons saturados do Latte são os que se seguram
 * melhor tanto sobre o claro quanto sobre o escuro.
 */
export const PALETTE = [
  '#dc8a78', // rosewater
  '#dd7878', // flamingo
  '#ea76cb', // pink
  '#8839ef', // mauve
  '#d20f39', // red
  '#e64553', // maroon
  '#fe640b', // peach
  '#df8e1d', // yellow
  '#40a02b', // green
  '#179299', // teal
  '#04a5e5', // sky
  '#209fb5', // sapphire
  '#1e66f5', // blue
  '#7287fd', // lavender
  '#8c8fa1', // overlay1
  '#9ca0b0', // overlay0
]
