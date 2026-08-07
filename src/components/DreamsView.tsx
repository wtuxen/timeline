import { useMemo } from 'react'
import { HORIZON_LABELS, HORIZON_ORDER, type Dream, type ID } from '../types'
import { useDatabase } from '../state/database'
import { Badge } from './ui/Badge'

interface DreamsViewProps {
  dreams: Dream[]
  onOpen: (id?: ID) => void
}

const HORIZON_HINTS: Record<string, string> = {
  curto: 'Próximos 1–2 anos',
  medio: '3–5 anos',
  longo: '5–10 anos',
  'algum-dia': 'Sem prazo',
}

export function DreamsView({ dreams, onOpen }: DreamsViewProps) {
  const { statusById, categoryById } = useDatabase()

  const columns = useMemo(
    () =>
      HORIZON_ORDER.map((horizon) => ({
        horizon,
        items: dreams
          .filter((dream) => dream.horizon === horizon)
          .sort(
            (a, b) =>
              b.priority - a.priority ||
              (a.targetYear ?? 9999) - (b.targetYear ?? 9999) ||
              a.title.localeCompare(b.title),
          ),
      })),
    [dreams],
  )

  return (
    <div className="flex-1 overflow-auto">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map(({ horizon, items }) => (
          <section key={horizon} className="card flex flex-col p-3">
            <header className="mb-3 flex items-baseline justify-between gap-2 px-1">
              <div>
                <h2 className="text-sm font-semibold">{HORIZON_LABELS[horizon]}</h2>
                <p className="text-[11px] text-slate-400">{HORIZON_HINTS[horizon]}</p>
              </div>
              <span className="text-xs text-slate-400">{items.length}</span>
            </header>

            <div className="flex flex-col gap-2">
              {items.map((dream) => {
                const status = dream.statusId ? statusById.get(dream.statusId) : null
                const category = dream.categoryId ? categoryById.get(dream.categoryId) : null
                return (
                  <button
                    key={dream.id}
                    type="button"
                    onClick={() => onOpen(dream.id)}
                    className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-left transition hover:border-sky-400 hover:bg-white dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-sky-600 dark:hover:bg-slate-800"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm leading-snug font-medium">{dream.title}</h3>
                      <span
                        className="shrink-0 text-[11px] text-amber-500"
                        title={`Prioridade ${dream.priority} de 5`}
                      >
                        {'★'.repeat(dream.priority)}
                      </span>
                    </div>

                    {dream.description ? (
                      <p className="mt-1.5 line-clamp-3 text-xs text-slate-500 dark:text-slate-400">
                        {dream.description}
                      </p>
                    ) : null}

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      {dream.targetYear ? (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          {dream.targetYear}
                        </span>
                      ) : null}
                      {status ? <Badge label={status.name} color={status.color} /> : null}
                      {category ? <Badge label={category.name} color={category.color} dot /> : null}
                    </div>
                  </button>
                )
              })}

              <button
                type="button"
                onClick={() => onOpen()}
                className="cursor-pointer rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-400 transition hover:border-sky-400 hover:text-sky-600 dark:border-slate-700 dark:hover:border-sky-600"
              >
                + Adicionar
              </button>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
