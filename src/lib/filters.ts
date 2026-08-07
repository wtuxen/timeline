import type { Dream, Filters, Milestone, Task } from '../types'

export const EMPTY_FILTERS: Filters = {
  search: '',
  statusIds: [],
  categoryIds: [],
  from: '',
  to: '',
  showTasks: true,
  showMilestones: true,
}

export function isFilterActive(filters: Filters): boolean {
  return (
    filters.search.trim() !== '' ||
    filters.statusIds.length > 0 ||
    filters.categoryIds.length > 0 ||
    filters.from !== '' ||
    filters.to !== '' ||
    !filters.showTasks ||
    !filters.showMilestones
  )
}

function matchesText(filters: Filters, ...fields: string[]): boolean {
  const term = filters.search.trim().toLowerCase()
  if (!term) return true
  return fields.some((field) => field.toLowerCase().includes(term))
}

/** Lista vazia significa "sem restrição", não "nada selecionado". */
function matchesSelection(selected: string[], value: string | null): boolean {
  if (selected.length === 0) return true
  if (value === null) return selected.includes('__none__')
  return selected.includes(value)
}

export function filterTasks(tasks: Task[], filters: Filters): Task[] {
  if (!filters.showTasks) return []
  return tasks.filter(
    (task) =>
      matchesText(filters, task.title, task.description) &&
      matchesSelection(filters.statusIds, task.statusId) &&
      matchesSelection(filters.categoryIds, task.categoryId) &&
      // Intervalo: mantém a tarefa se ela encostar na janela em qualquer ponto.
      (!filters.to || task.start <= filters.to) &&
      (!filters.from || task.end >= filters.from),
  )
}

export function filterMilestones(milestones: Milestone[], filters: Filters): Milestone[] {
  if (!filters.showMilestones) return []
  return milestones.filter(
    (milestone) =>
      matchesText(filters, milestone.title, milestone.description) &&
      matchesSelection(filters.statusIds, milestone.statusId) &&
      matchesSelection(filters.categoryIds, milestone.categoryId) &&
      (!filters.from || milestone.date >= filters.from) &&
      (!filters.to || milestone.date <= filters.to),
  )
}

/** Sonhos ignoram o recorte de datas: por definição, muitos não têm data. */
export function filterDreams(dreams: Dream[], filters: Filters): Dream[] {
  return dreams.filter(
    (dream) =>
      matchesText(filters, dream.title, dream.description) &&
      matchesSelection(filters.categoryIds, dream.categoryId) &&
      (filters.statusIds.length === 0 ||
        (dream.statusId === null
          ? filters.statusIds.includes('__none__')
          : filters.statusIds.includes(dream.statusId))),
  )
}
