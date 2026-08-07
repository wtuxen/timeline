import { useEffect, useMemo, useState } from 'react'
import { useDatabase } from './state/database'
import type { Filters, ID, ViewMode, ZoomLevel } from './types'
import { EMPTY_FILTERS, filterDreams, filterMilestones, filterTasks } from './lib/filters'
import { Header } from './components/Header'
import { FilterBar } from './components/FilterBar'
import { TimelineView } from './components/timeline/TimelineView'
import { TableView } from './components/TableView'
import { DreamsView } from './components/DreamsView'
import { SettingsView } from './components/SettingsView'
import { ItemDialog, type ItemDialogTarget } from './components/ItemDialog'
import { DreamDialog } from './components/DreamDialog'
import { addISODays, today } from './lib/dates'

const UI_KEY = 'timeline.ui.v1'

interface UiPreferences {
  view: ViewMode
  zoom: ZoomLevel
  groupByCategory: boolean
  theme: 'light' | 'dark'
}

function loadPreferences(): UiPreferences {
  const fallback: UiPreferences = {
    view: 'timeline',
    zoom: 'month',
    groupByCategory: true,
    theme: window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  }
  try {
    const raw = localStorage.getItem(UI_KEY)
    return raw ? { ...fallback, ...(JSON.parse(raw) as Partial<UiPreferences>) } : fallback
  } catch {
    return fallback
  }
}

export function App() {
  const { db, ready } = useDatabase()
  const [prefs, setPrefs] = useState<UiPreferences>(loadPreferences)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [focusToken, setFocusToken] = useState(0)
  const [itemDialog, setItemDialog] = useState<ItemDialogTarget | null>(null)
  const [dreamDialog, setDreamDialog] = useState<{ id?: ID } | null>(null)

  useEffect(() => {
    localStorage.setItem(UI_KEY, JSON.stringify(prefs))
    document.documentElement.classList.toggle('dark', prefs.theme === 'dark')
  }, [prefs])

  const visibleTasks = useMemo(() => filterTasks(db.tasks, filters), [db.tasks, filters])
  const visibleMilestones = useMemo(
    () => filterMilestones(db.milestones, filters),
    [db.milestones, filters],
  )
  const visibleDreams = useMemo(() => filterDreams(db.dreams, filters), [db.dreams, filters])

  const patchPrefs = (values: Partial<UiPreferences>) => setPrefs((current) => ({ ...current, ...values }))

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">Carregando…</div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <Header
        view={prefs.view}
        onViewChange={(view) => patchPrefs({ view })}
        theme={prefs.theme}
        onThemeToggle={() => patchPrefs({ theme: prefs.theme === 'dark' ? 'light' : 'dark' })}
        onNewTask={() =>
          setItemDialog({ kind: 'task', defaults: { start: today(), end: addISODays(today(), 14) } })
        }
        onNewMilestone={() => setItemDialog({ kind: 'milestone', defaults: { date: today() } })}
        onNewDream={() => setDreamDialog({})}
      />

      {prefs.view !== 'settings' ? (
        <FilterBar
          view={prefs.view}
          filters={filters}
          onFiltersChange={setFilters}
          zoom={prefs.zoom}
          onZoomChange={(zoom) => patchPrefs({ zoom })}
          groupByCategory={prefs.groupByCategory}
          onGroupToggle={() => patchPrefs({ groupByCategory: !prefs.groupByCategory })}
          onFocusToday={() => setFocusToken((token) => token + 1)}
        />
      ) : null}

      <main className="flex flex-1 flex-col overflow-hidden p-4">
        {prefs.view === 'timeline' ? (
          <TimelineView
            tasks={visibleTasks}
            milestones={visibleMilestones}
            zoom={prefs.zoom}
            groupByCategory={prefs.groupByCategory}
            focusToken={focusToken}
            onOpen={setItemDialog}
          />
        ) : null}

        {prefs.view === 'table' ? (
          <TableView tasks={visibleTasks} milestones={visibleMilestones} onOpen={setItemDialog} />
        ) : null}

        {prefs.view === 'dreams' ? (
          <DreamsView dreams={visibleDreams} onOpen={(id) => setDreamDialog({ id })} />
        ) : null}

        {prefs.view === 'settings' ? <SettingsView /> : null}
      </main>

      {itemDialog ? <ItemDialog target={itemDialog} onClose={() => setItemDialog(null)} /> : null}
      {dreamDialog ? <DreamDialog id={dreamDialog.id} onClose={() => setDreamDialog(null)} /> : null}
    </div>
  )
}
