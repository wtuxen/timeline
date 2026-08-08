export type ID = string

/** Data no formato `YYYY-MM-DD` (sem fuso, sempre local). */
export type ISODate = string

/**
 * Status e categorias são dados, não código: ficam no banco do usuário e podem
 * ser criados, renomeados, recoloridos, reordenados ou removidos na aba Ajustes.
 */
export interface StatusDef {
  id: ID
  name: string
  /** Cor base em hex (`#04a5e5`). */
  color: string
  /** Status "terminais" não entram no cálculo de trabalho em aberto. */
  done?: boolean
}

export interface CategoryDef {
  id: ID
  name: string
  color: string
}

export interface Task {
  id: ID
  title: string
  description: string
  start: ISODate
  end: ISODate
  statusId: ID
  categoryId: ID | null
  /** 0–100. Opcional; usado na barra da timeline e na tabela. */
  progress?: number
  createdAt: string
  updatedAt: string
}

export interface Milestone {
  id: ID
  title: string
  description: string
  date: ISODate
  statusId: ID
  categoryId: ID | null
  /**
   * Tarefa a que o marco pertence. Preenchido = o marco é desenhado como
   * losango na mesma linha da barra da tarefa, em vez de ocupar linha própria.
   */
  taskId?: ID | null
  createdAt: string
  updatedAt: string
}

export type DreamHorizon = 'curto' | 'medio' | 'longo' | 'algum-dia'

export interface Dream {
  id: ID
  title: string
  description: string
  horizon: DreamHorizon
  /** Ano-alvo aproximado; sonho não tem prazo obrigatório. */
  targetYear?: number | null
  categoryId: ID | null
  statusId: ID | null
  /** 1 (baixa) a 5 (altíssima). */
  priority: number
  createdAt: string
  updatedAt: string
}

export interface Database {
  /** Versão do formato do arquivo, para futuras migrações. */
  version: number
  meta: {
    title: string
    owner: string
    updatedAt: string
  }
  statuses: StatusDef[]
  categories: CategoryDef[]
  tasks: Task[]
  milestones: Milestone[]
  dreams: Dream[]
}

export type ViewMode = 'timeline' | 'table' | 'dreams' | 'settings'

export type ZoomLevel = 'day' | 'week' | 'month' | 'quarter' | 'year'

export interface Filters {
  search: string
  statusIds: ID[]
  categoryIds: ID[]
  /** Recorte opcional do período exibido. */
  from: ISODate | ''
  to: ISODate | ''
  showTasks: boolean
  showMilestones: boolean
}

export const HORIZON_LABELS: Record<DreamHorizon, string> = {
  curto: 'Curto prazo',
  medio: 'Médio prazo',
  longo: 'Longo prazo',
  'algum-dia': 'Algum dia',
}

export const HORIZON_ORDER: DreamHorizon[] = ['curto', 'medio', 'longo', 'algum-dia']
