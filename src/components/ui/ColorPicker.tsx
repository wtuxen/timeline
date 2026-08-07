import { useEffect, useRef, useState } from 'react'
import { PALETTE } from '../../lib/colors'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
}

/** Amostra clicável que abre a paleta — mantém as linhas de Ajustes compactas. */
export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  return (
    <div className="relative" ref={container}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Escolher cor"
        title="Escolher cor"
        className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-slate-300 transition hover:scale-105 dark:border-slate-700"
      >
        <span className="size-5 rounded-full" style={{ backgroundColor: value }} />
      </button>

      {open ? (
        <div className="card absolute top-full left-0 z-30 mt-1 w-48 p-2">
          <div className="grid grid-cols-8 gap-1.5">
            {PALETTE.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Cor ${color}`}
                onClick={() => {
                  onChange(color)
                  setOpen(false)
                }}
                style={{ backgroundColor: color }}
                className={`size-4 cursor-pointer rounded-full transition hover:scale-125 ${
                  value.toLowerCase() === color
                    ? 'ring-2 ring-slate-900 ring-offset-1 dark:ring-white dark:ring-offset-slate-900'
                    : ''
                }`}
              />
            ))}
          </div>
          <label className="mt-2 flex cursor-pointer items-center gap-2 border-t border-slate-200 pt-2 text-xs text-slate-500 dark:border-slate-800">
            <input
              type="color"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              className="size-6 cursor-pointer rounded border border-slate-300 bg-transparent dark:border-slate-700"
            />
            Personalizada
          </label>
        </div>
      ) : null}
    </div>
  )
}
