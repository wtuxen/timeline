import type { ViewMode } from '../types'
import { useDatabase } from '../state/database'

interface HeaderProps {
  view: ViewMode
  onViewChange: (view: ViewMode) => void
  theme: 'light' | 'dark'
  onThemeToggle: () => void
  onNewTask: () => void
  onNewMilestone: () => void
  onNewDream: () => void
}

const TABS: { id: ViewMode; label: string; icon: string }[] = [
  { id: 'timeline', label: 'Timeline', icon: '▤' },
  { id: 'table', label: 'Tabela', icon: '☰' },
  { id: 'dreams', label: 'Sonhos', icon: '✦' },
  { id: 'settings', label: 'Ajustes', icon: '⚙' },
]

export function Header({
  view,
  onViewChange,
  theme,
  onThemeToggle,
  onNewTask,
  onNewMilestone,
  onNewDream,
}: HeaderProps) {
  const { db, statusById } = useDatabase()

  const open = db.tasks.filter((task) => !statusById.get(task.statusId)?.done).length
  const done = db.tasks.length - open

  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="min-w-0">
        <h1 className="truncate text-base font-semibold">{db.meta.title || 'Minha timeline'}</h1>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          {db.meta.owner ? `${db.meta.owner} · ` : ''}
          {open} em aberto · {done} encerradas · {db.milestones.length} marcos · {db.dreams.length} sonhos
        </p>
      </div>

      <nav className="order-last flex w-full gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 sm:order-none sm:ml-4 sm:w-auto dark:bg-slate-800">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onViewChange(tab.id)}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition sm:flex-none ${
              view === tab.id
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <span aria-hidden className="text-xs">
              {tab.icon}
            </span>
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        {view === 'dreams' ? (
          <button type="button" className="btn-primary" onClick={onNewDream}>
            + Sonho
          </button>
        ) : view === 'settings' ? null : (
          <>
            <button type="button" className="btn-ghost" onClick={onNewMilestone}>
              + Marco
            </button>
            <button type="button" className="btn-primary" onClick={onNewTask}>
              + Tarefa
            </button>
          </>
        )}
        <button
          type="button"
          onClick={onThemeToggle}
          className="btn-ghost px-2"
          aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
          title={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </div>
    </header>
  )
}
