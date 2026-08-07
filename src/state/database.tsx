import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { CategoryDef, Database, Dream, ID, Milestone, StatusDef, Task } from '../types'
import { bootstrap, clearLocal, normalize, randomId, saveLocal } from '../lib/storage'
import { createEmptyDatabase, createSeedDatabase } from '../lib/seed'

type Draft<T> = Partial<T> & { id?: ID }

interface DatabaseContextValue {
  db: Database
  ready: boolean
  statusById: Map<ID, StatusDef>
  categoryById: Map<ID, CategoryDef>
  saveTask: (draft: Draft<Task>) => Task
  deleteTask: (id: ID) => void
  saveMilestone: (draft: Draft<Milestone>) => Milestone
  deleteMilestone: (id: ID) => void
  saveDream: (draft: Draft<Dream>) => Dream
  deleteDream: (id: ID) => void
  saveStatus: (draft: Draft<StatusDef>) => void
  deleteStatus: (id: ID) => void
  moveStatus: (id: ID, direction: -1 | 1) => void
  saveCategory: (draft: Draft<CategoryDef>) => void
  deleteCategory: (id: ID) => void
  moveCategory: (id: ID, direction: -1 | 1) => void
  setMeta: (meta: Partial<Database['meta']>) => void
  replaceDatabase: (next: Database) => void
  resetToExample: () => void
  clearEverything: () => void
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null)

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database>(() => createEmptyDatabase())
  const [ready, setReady] = useState(false)
  const dirty = useRef(false)

  useEffect(() => {
    let cancelled = false
    bootstrap().then((loaded) => {
      if (cancelled) return
      setDb(loaded)
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Só persiste depois do bootstrap, para não gravar a base vazia inicial por cima
  // de algo que ainda estava carregando.
  useEffect(() => {
    if (!ready || !dirty.current) return
    saveLocal(db)
  }, [db, ready])

  const update = useCallback((mutate: (draft: Database) => Database) => {
    dirty.current = true
    setDb((current) => {
      const next = mutate(current)
      return { ...next, meta: { ...next.meta, updatedAt: new Date().toISOString() } }
    })
  }, [])

  const statusById = useMemo(() => new Map(db.statuses.map((s) => [s.id, s])), [db.statuses])
  const categoryById = useMemo(() => new Map(db.categories.map((c) => [c.id, c])), [db.categories])

  const saveTask = useCallback<DatabaseContextValue['saveTask']>(
    (draft) => {
      const now = new Date().toISOString()
      const id = draft.id ?? `task-${randomId()}`
      let saved!: Task
      update((current) => {
        const existing = current.tasks.find((t) => t.id === id)
        saved = {
          id,
          title: draft.title ?? existing?.title ?? 'Sem título',
          description: draft.description ?? existing?.description ?? '',
          start: draft.start ?? existing?.start ?? '',
          end: draft.end ?? existing?.end ?? '',
          statusId: draft.statusId ?? existing?.statusId ?? current.statuses[0]?.id ?? '',
          categoryId: draft.categoryId !== undefined ? draft.categoryId : (existing?.categoryId ?? null),
          progress: draft.progress ?? existing?.progress ?? 0,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        }
        return {
          ...current,
          tasks: existing
            ? current.tasks.map((t) => (t.id === id ? saved : t))
            : [...current.tasks, saved],
        }
      })
      return saved
    },
    [update],
  )

  const deleteTask = useCallback<DatabaseContextValue['deleteTask']>(
    (id) => update((c) => ({ ...c, tasks: c.tasks.filter((t) => t.id !== id) })),
    [update],
  )

  const saveMilestone = useCallback<DatabaseContextValue['saveMilestone']>(
    (draft) => {
      const now = new Date().toISOString()
      const id = draft.id ?? `ms-${randomId()}`
      let saved!: Milestone
      update((current) => {
        const existing = current.milestones.find((m) => m.id === id)
        saved = {
          id,
          title: draft.title ?? existing?.title ?? 'Sem título',
          description: draft.description ?? existing?.description ?? '',
          date: draft.date ?? existing?.date ?? '',
          statusId: draft.statusId ?? existing?.statusId ?? current.statuses[0]?.id ?? '',
          categoryId: draft.categoryId !== undefined ? draft.categoryId : (existing?.categoryId ?? null),
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        }
        return {
          ...current,
          milestones: existing
            ? current.milestones.map((m) => (m.id === id ? saved : m))
            : [...current.milestones, saved],
        }
      })
      return saved
    },
    [update],
  )

  const deleteMilestone = useCallback<DatabaseContextValue['deleteMilestone']>(
    (id) => update((c) => ({ ...c, milestones: c.milestones.filter((m) => m.id !== id) })),
    [update],
  )

  const saveDream = useCallback<DatabaseContextValue['saveDream']>(
    (draft) => {
      const now = new Date().toISOString()
      const id = draft.id ?? `dream-${randomId()}`
      let saved!: Dream
      update((current) => {
        const existing = current.dreams.find((d) => d.id === id)
        saved = {
          id,
          title: draft.title ?? existing?.title ?? 'Sem título',
          description: draft.description ?? existing?.description ?? '',
          horizon: draft.horizon ?? existing?.horizon ?? 'algum-dia',
          targetYear: draft.targetYear !== undefined ? draft.targetYear : (existing?.targetYear ?? null),
          categoryId: draft.categoryId !== undefined ? draft.categoryId : (existing?.categoryId ?? null),
          statusId: draft.statusId !== undefined ? draft.statusId : (existing?.statusId ?? null),
          priority: draft.priority ?? existing?.priority ?? 3,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        }
        return {
          ...current,
          dreams: existing
            ? current.dreams.map((d) => (d.id === id ? saved : d))
            : [...current.dreams, saved],
        }
      })
      return saved
    },
    [update],
  )

  const deleteDream = useCallback<DatabaseContextValue['deleteDream']>(
    (id) => update((c) => ({ ...c, dreams: c.dreams.filter((d) => d.id !== id) })),
    [update],
  )

  const saveStatus = useCallback<DatabaseContextValue['saveStatus']>(
    (draft) => {
      const id = draft.id ?? `st-${randomId()}`
      update((current) => {
        const existing = current.statuses.find((s) => s.id === id)
        const next: StatusDef = {
          id,
          name: draft.name ?? existing?.name ?? 'Novo status',
          color: draft.color ?? existing?.color ?? '#94a3b8',
          done: draft.done !== undefined ? draft.done : (existing?.done ?? false),
        }
        return {
          ...current,
          statuses: existing
            ? current.statuses.map((s) => (s.id === id ? next : s))
            : [...current.statuses, next],
        }
      })
    },
    [update],
  )

  /** Remover um status realoca os itens afetados para o primeiro status restante. */
  const deleteStatus = useCallback<DatabaseContextValue['deleteStatus']>(
    (id) =>
      update((current) => {
        if (current.statuses.length <= 1) return current
        const statuses = current.statuses.filter((s) => s.id !== id)
        const fallback = statuses[0].id
        return {
          ...current,
          statuses,
          tasks: current.tasks.map((t) => (t.statusId === id ? { ...t, statusId: fallback } : t)),
          milestones: current.milestones.map((m) =>
            m.statusId === id ? { ...m, statusId: fallback } : m,
          ),
          dreams: current.dreams.map((d) => (d.statusId === id ? { ...d, statusId: null } : d)),
        }
      }),
    [update],
  )

  const moveStatus = useCallback<DatabaseContextValue['moveStatus']>(
    (id, direction) => update((c) => ({ ...c, statuses: move(c.statuses, id, direction) })),
    [update],
  )

  const saveCategory = useCallback<DatabaseContextValue['saveCategory']>(
    (draft) => {
      const id = draft.id ?? `cat-${randomId()}`
      update((current) => {
        const existing = current.categories.find((c) => c.id === id)
        const next: CategoryDef = {
          id,
          name: draft.name ?? existing?.name ?? 'Nova categoria',
          color: draft.color ?? existing?.color ?? '#6366f1',
        }
        return {
          ...current,
          categories: existing
            ? current.categories.map((c) => (c.id === id ? next : c))
            : [...current.categories, next],
        }
      })
    },
    [update],
  )

  /** Itens da categoria removida ficam "Sem categoria" em vez de sumirem. */
  const deleteCategory = useCallback<DatabaseContextValue['deleteCategory']>(
    (id) =>
      update((current) => ({
        ...current,
        categories: current.categories.filter((c) => c.id !== id),
        tasks: current.tasks.map((t) => (t.categoryId === id ? { ...t, categoryId: null } : t)),
        milestones: current.milestones.map((m) =>
          m.categoryId === id ? { ...m, categoryId: null } : m,
        ),
        dreams: current.dreams.map((d) => (d.categoryId === id ? { ...d, categoryId: null } : d)),
      })),
    [update],
  )

  const moveCategory = useCallback<DatabaseContextValue['moveCategory']>(
    (id, direction) => update((c) => ({ ...c, categories: move(c.categories, id, direction) })),
    [update],
  )

  const setMeta = useCallback<DatabaseContextValue['setMeta']>(
    (meta) => update((c) => ({ ...c, meta: { ...c.meta, ...meta } })),
    [update],
  )

  const replaceDatabase = useCallback<DatabaseContextValue['replaceDatabase']>(
    (next) => update(() => normalize(next)),
    [update],
  )

  const resetToExample = useCallback(() => update(() => createSeedDatabase()), [update])

  const clearEverything = useCallback(() => {
    clearLocal()
    update((current) => createEmptyDatabase(current))
  }, [update])

  const value = useMemo<DatabaseContextValue>(
    () => ({
      db,
      ready,
      statusById,
      categoryById,
      saveTask,
      deleteTask,
      saveMilestone,
      deleteMilestone,
      saveDream,
      deleteDream,
      saveStatus,
      deleteStatus,
      moveStatus,
      saveCategory,
      deleteCategory,
      moveCategory,
      setMeta,
      replaceDatabase,
      resetToExample,
      clearEverything,
    }),
    [
      db,
      ready,
      statusById,
      categoryById,
      saveTask,
      deleteTask,
      saveMilestone,
      deleteMilestone,
      saveDream,
      deleteDream,
      saveStatus,
      deleteStatus,
      moveStatus,
      saveCategory,
      deleteCategory,
      moveCategory,
      setMeta,
      replaceDatabase,
      resetToExample,
      clearEverything,
    ],
  )

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDatabase(): DatabaseContextValue {
  const context = useContext(DatabaseContext)
  if (!context) throw new Error('useDatabase precisa estar dentro de <DatabaseProvider>.')
  return context
}

function move<T extends { id: ID }>(items: T[], id: ID, direction: -1 | 1): T[] {
  const index = items.findIndex((item) => item.id === id)
  const target = index + direction
  if (index < 0 || target < 0 || target >= items.length) return items
  const next = [...items]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}
