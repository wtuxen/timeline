import type { Filters, ViewMode, ZoomLevel } from '../types'
import { useDatabase } from '../state/database'
import { MultiSelect, type Option } from './ui/MultiSelect'
import { EMPTY_FILTERS, isFilterActive } from '../lib/filters'
import { ZOOM_CONFIG, ZOOM_LEVELS } from './timeline/scale'

interface FilterBarProps {
  view: ViewMode
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  zoom: ZoomLevel
  onZoomChange: (zoom: ZoomLevel) => void
  groupByCategory: boolean
  onGroupToggle: () => void
  onFocusToday: () => void
}

export function FilterBar({
  view,
  filters,
  onFiltersChange,
  zoom,
  onZoomChange,
  groupByCategory,
  onGroupToggle,
  onFocusToday,
}: FilterBarProps) {
  const { db } = useDatabase()
  const patch = (values: Partial<Filters>) => onFiltersChange({ ...filters, ...values })

  const statusOptions: Option[] = db.statuses.map((status) => ({
    value: status.id,
    label: status.name,
    color: status.color,
  }))

  const categoryOptions: Option[] = [
    ...db.categories.map((category) => ({
      value: category.id,
      label: category.name,
      color: category.color,
    })),
    { value: '__none__', label: 'Sem categoria' },
  ]

  const isTimeline = view === 'timeline'
  const isDreams = view === 'dreams'

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
      <div className="relative">
        <input
          type="search"
          value={filters.search}
          onChange={(event) => patch({ search: event.target.value })}
          placeholder="Buscar por título ou descrição…"
          className="field-input w-56 pl-8"
          aria-label="Buscar"
        />
        <svg
          viewBox="0 0 20 20"
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="9" cy="9" r="5.5" />
          <path d="M13 13l4 4" strokeLinecap="round" />
        </svg>
      </div>

      <MultiSelect
        label="Status"
        options={statusOptions}
        selected={filters.statusIds}
        onChange={(statusIds) => patch({ statusIds })}
      />

      <MultiSelect
        label="Categoria"
        options={categoryOptions}
        selected={filters.categoryIds}
        onChange={(categoryIds) => patch({ categoryIds })}
      />

      {!isDreams ? (
        <>
          <div className="flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 dark:border-slate-700">
            <label className="text-xs text-slate-500 dark:text-slate-400" htmlFor="filter-from">
              De
            </label>
            <input
              id="filter-from"
              type="date"
              value={filters.from}
              onChange={(event) => patch({ from: event.target.value })}
              className="bg-transparent text-sm outline-none"
            />
            <label className="ml-1 text-xs text-slate-500 dark:text-slate-400" htmlFor="filter-to">
              até
            </label>
            <input
              id="filter-to"
              type="date"
              value={filters.to}
              onChange={(event) => patch({ to: event.target.value })}
              className="bg-transparent text-sm outline-none"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs dark:border-slate-700">
            <label className="flex cursor-pointer items-center gap-1">
              <input
                type="checkbox"
                className="size-3.5 accent-sky-600"
                checked={filters.showTasks}
                onChange={(event) => patch({ showTasks: event.target.checked })}
              />
              Tarefas
            </label>
            <label className="ml-2 flex cursor-pointer items-center gap-1">
              <input
                type="checkbox"
                className="size-3.5 accent-sky-600"
                checked={filters.showMilestones}
                onChange={(event) => patch({ showMilestones: event.target.checked })}
              />
              Marcos
            </label>
          </div>
        </>
      ) : null}

      {isFilterActive(filters) ? (
        <button type="button" className="btn-ghost" onClick={() => onFiltersChange(EMPTY_FILTERS)}>
          Limpar filtros
        </button>
      ) : null}

      {isTimeline ? (
        <div className="ml-auto flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            className={`btn-ghost shrink-0 ${groupByCategory ? 'ring-2 ring-sky-500/40' : ''}`}
            onClick={onGroupToggle}
            title="Agrupar as raias por categoria"
          >
            Agrupar
          </button>
          <button type="button" className="btn-ghost shrink-0" onClick={onFocusToday}>
            Hoje
          </button>
          <div
            className="flex shrink-0 items-center rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800"
            role="group"
            aria-label="Nível de zoom"
          >
            {ZOOM_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => onZoomChange(level)}
                className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  zoom === level
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {ZOOM_CONFIG[level].label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
