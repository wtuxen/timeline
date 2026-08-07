import { useEffect, useRef, useState } from 'react'

export interface Option {
  value: string
  label: string
  color?: string
}

interface MultiSelectProps {
  label: string
  options: Option[]
  selected: string[]
  onChange: (selected: string[]) => void
  emptyLabel?: string
}

/** Dropdown com checkboxes; nada selecionado significa "todos". */
export function MultiSelect({ label, options, selected, onChange, emptyLabel }: MultiSelectProps) {
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

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value])
  }

  const summary =
    selected.length === 0
      ? (emptyLabel ?? 'Todos')
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? '1 selecionado')
        : `${selected.length} selecionados`

  return (
    <div className="relative" ref={container}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn-ghost min-w-40 justify-between"
        aria-expanded={open}
      >
        <span className="truncate">
          <span className="text-slate-500 dark:text-slate-400">{label}: </span>
          {summary}
        </span>
        <svg viewBox="0 0 20 20" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div className="card absolute z-30 mt-1 max-h-72 w-60 overflow-y-auto p-1.5">
          {options.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-slate-500">Nada configurado ainda.</p>
          ) : null}
          {options.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <input
                type="checkbox"
                className="size-4 accent-sky-600"
                checked={selected.includes(option.value)}
                onChange={() => toggle(option.value)}
              />
              {option.color ? (
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: option.color }}
                />
              ) : null}
              <span className="truncate">{option.label}</span>
            </label>
          ))}
          {selected.length > 0 ? (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mt-1 w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-xs text-sky-600 hover:bg-slate-100 dark:text-sky-400 dark:hover:bg-slate-800"
            >
              Limpar seleção
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
