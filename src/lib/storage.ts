import type { CategoryDef, Database, Dream, Milestone, StatusDef, Task } from '../types'
import { HORIZON_ORDER } from '../types'
import { DB_VERSION, createSeedDatabase } from './seed'
import { today } from './dates'

export const STORAGE_KEY = 'timeline.db.v1'

/**
 * Caminho opcional para uma base privada. Se você quiser versionar seus dados
 * sem publicá-los, coloque o arquivo em `public/data/timeline.json` — ele está
 * no .gitignore e é carregado apenas quando ainda não existe base local.
 */
export const PRIVATE_DATA_URL = `${import.meta.env.BASE_URL}data/timeline.json`

export function loadLocal(): Database | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return normalize(JSON.parse(raw))
  } catch (error) {
    console.warn('Não foi possível ler a base local, ignorando.', error)
    return null
  }
}

export function saveLocal(db: Database): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch (error) {
    console.error('Não foi possível salvar a base local.', error)
  }
}

export function clearLocal(): void {
  localStorage.removeItem(STORAGE_KEY)
}

/** Base privada opcional; ausência dela é o caso normal e não é erro. */
export async function loadPrivateFile(): Promise<Database | null> {
  try {
    const response = await fetch(PRIVATE_DATA_URL, { cache: 'no-store' })
    if (!response.ok) return null
    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('json')) return null
    return normalize(await response.json())
  } catch {
    return null
  }
}

export async function bootstrap(): Promise<Database> {
  const local = loadLocal()
  if (local) return local
  const priv = await loadPrivateFile()
  if (priv) return priv
  return createSeedDatabase()
}

export function exportToFile(db: Database, filename?: string): void {
  const payload: Database = { ...db, meta: { ...db.meta, updatedAt: new Date().toISOString() } }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename ?? `timeline-${today()}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function importFromFile(file: File): Promise<Database> {
  const text = await file.text()
  return normalize(JSON.parse(text))
}

/**
 * Aceita qualquer JSON e devolve um `Database` consistente: campos faltando
 * ganham default e referências quebradas (status/categoria inexistentes)
 * viram `null` em vez de estourar na renderização.
 */
export function normalize(input: unknown): Database {
  if (!input || typeof input !== 'object') throw new Error('Arquivo inválido: não é um objeto JSON.')
  const raw = input as Partial<Database>
  const now = new Date().toISOString()

  const statuses = asArray<StatusDef>(raw.statuses)
    .map((s, index) => ({
      id: str(s.id) || `st-${index}`,
      name: str(s.name) || `Status ${index + 1}`,
      color: color(s.color, '#9ca0b0'),
      done: Boolean(s.done),
    }))
    .filter(uniqueById())

  const categories = asArray<CategoryDef>(raw.categories)
    .map((c, index) => ({
      id: str(c.id) || `cat-${index}`,
      name: str(c.name) || `Categoria ${index + 1}`,
      color: color(c.color, '#7287fd'),
    }))
    .filter(uniqueById())

  if (statuses.length === 0) throw new Error('Arquivo inválido: nenhum status encontrado.')

  const statusIds = new Set(statuses.map((s) => s.id))
  const categoryIds = new Set(categories.map((c) => c.id))
  const fallbackStatus = statuses[0].id
  const stamp = (value: unknown) => str(value) || now

  const tasks: Task[] = asArray<Task>(raw.tasks).map((t, index) => {
    const start = date(t.start) ?? today()
    const end = date(t.end) ?? start
    return {
      id: str(t.id) || `task-${index}-${randomId()}`,
      title: str(t.title) || 'Sem título',
      description: str(t.description),
      start: start <= end ? start : end,
      end: start <= end ? end : start,
      statusId: statusIds.has(str(t.statusId)) ? str(t.statusId) : fallbackStatus,
      categoryId: categoryIds.has(str(t.categoryId)) ? str(t.categoryId) : null,
      progress: clampProgress(t.progress),
      createdAt: stamp(t.createdAt),
      updatedAt: stamp(t.updatedAt),
    }
  })

  const milestones: Milestone[] = asArray<Milestone>(raw.milestones).map((m, index) => ({
    id: str(m.id) || `ms-${index}-${randomId()}`,
    title: str(m.title) || 'Sem título',
    description: str(m.description),
    date: date(m.date) ?? today(),
    statusId: statusIds.has(str(m.statusId)) ? str(m.statusId) : fallbackStatus,
    categoryId: categoryIds.has(str(m.categoryId)) ? str(m.categoryId) : null,
    createdAt: stamp(m.createdAt),
    updatedAt: stamp(m.updatedAt),
  }))

  const dreams: Dream[] = asArray<Dream>(raw.dreams).map((d, index) => ({
    id: str(d.id) || `dream-${index}-${randomId()}`,
    title: str(d.title) || 'Sem título',
    description: str(d.description),
    horizon: HORIZON_ORDER.includes(d.horizon as never) ? d.horizon! : 'algum-dia',
    targetYear: Number.isFinite(Number(d.targetYear)) && d.targetYear ? Number(d.targetYear) : null,
    categoryId: categoryIds.has(str(d.categoryId)) ? str(d.categoryId) : null,
    statusId: statusIds.has(str(d.statusId)) ? str(d.statusId) : null,
    priority: Math.min(5, Math.max(1, Math.round(Number(d.priority) || 3))),
    createdAt: stamp(d.createdAt),
    updatedAt: stamp(d.updatedAt),
  }))

  return {
    version: DB_VERSION,
    meta: {
      title: str(raw.meta?.title) || 'Minha timeline',
      owner: str(raw.meta?.owner),
      updatedAt: str(raw.meta?.updatedAt) || now,
    },
    statuses,
    categories,
    tasks,
    milestones,
    dreams,
  }
}

export function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID().slice(0, 8)
  return Math.random().toString(36).slice(2, 10)
}

function asArray<T>(value: unknown): Partial<T>[] {
  return Array.isArray(value) ? (value as Partial<T>[]) : []
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function color(value: unknown, fallback: string): string {
  const v = str(value)
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback
}

function date(value: unknown): string | null {
  const v = str(value)
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null
}

function clampProgress(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.min(100, Math.max(0, Math.round(n)))
}

function uniqueById<T extends { id: string }>() {
  const seen = new Set<string>()
  return (item: T) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  }
}
