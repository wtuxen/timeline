import type { CSSProperties } from 'react'

interface BadgeProps {
  label: string
  color: string
  /** Bolinha à esquerda; útil para diferenciar categoria de status. */
  dot?: boolean
  title?: string
}

export function Badge({ label, color, dot = false, title }: BadgeProps) {
  return (
    <span
      title={title ?? label}
      className="tinted-text tinted-surface inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap"
      style={{ '--tint-color': color } as CSSProperties}
    >
      {dot ? <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} /> : null}
      <span className="truncate">{label}</span>
    </span>
  )
}
