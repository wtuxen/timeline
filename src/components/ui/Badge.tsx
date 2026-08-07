import { withAlpha } from '../../lib/colors'

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
      className="inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: withAlpha(color, 0.16), color }}
    >
      {dot ? <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} /> : null}
      <span className="truncate">{label}</span>
    </span>
  )
}
