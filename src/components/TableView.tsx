import { useMemo, useState } from 'react'
import type { ID, ISODate, Milestone, Task } from '../types'
import { useDatabase } from '../state/database'
import { Badge } from './ui/Badge'
import { durationInDays, formatFull, relativeToToday } from '../lib/dates'
import type { ItemDialogTarget } from './ItemDialog'

interface TableViewProps {
  tasks: Task[]
  milestones: Milestone[]
  onOpen: (target: ItemDialogTarget) => void
}

type SortKey = 'title' | 'kind' | 'status' | 'category' | 'start' | 'end' | 'days'

interface Row {
  id: ID
  kind: 'task' | 'milestone'
  title: string
  description: string
  statusId: ID
  categoryId: ID | null
  start: ISODate
  end: ISODate
  days: number | null
  progress: number | null
  /** Título da tarefa dona do marco, quando ele mora dentro de uma. */
  parentTitle: string | null
}

export function TableView({ tasks, milestones, onOpen }: TableViewProps) {
  const { db, statusById, categoryById } = useDatabase()
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'start', dir: 1 })

  const rows = useMemo<Row[]>(() => {
    // Busca na base inteira: a tarefa dona pode estar fora do filtro atual.
    const taskTitleById = new Map(db.tasks.map((task) => [task.id, task.title]))
    const all: Row[] = [
      ...tasks.map((task) => ({
        id: task.id,
        kind: 'task' as const,
        title: task.title,
        description: task.description,
        statusId: task.statusId,
        categoryId: task.categoryId,
        start: task.start,
        end: task.end,
        days: durationInDays(task.start, task.end),
        progress: task.progress ?? 0,
        parentTitle: null,
      })),
      ...milestones.map((milestone) => ({
        id: milestone.id,
        kind: 'milestone' as const,
        title: milestone.title,
        description: milestone.description,
        statusId: milestone.statusId,
        categoryId: milestone.categoryId,
        start: milestone.date,
        end: milestone.date,
        days: null,
        progress: null,
        parentTitle: milestone.taskId ? (taskTitleById.get(milestone.taskId) ?? null) : null,
      })),
    ]

    const value = (row: Row): string | number => {
      switch (sort.key) {
        case 'title':
          return row.title.toLowerCase()
        case 'kind':
          return row.kind
        case 'status':
          return statusById.get(row.statusId)?.name.toLowerCase() ?? ''
        case 'category':
          return row.categoryId ? (categoryById.get(row.categoryId)?.name.toLowerCase() ?? '') : 'zzz'
        case 'days':
          return row.days ?? -1
        case 'end':
          return row.end
        case 'start':
        default:
          return row.start
      }
    }

    return all.sort((a, b) => {
      const va = value(a)
      const vb = value(b)
      if (va < vb) return -1 * sort.dir
      if (va > vb) return 1 * sort.dir
      return a.title.localeCompare(b.title)
    })
  }, [tasks, milestones, sort, statusById, categoryById, db.tasks])

  const toggleSort = (key: SortKey) =>
    setSort((current) => ({ key, dir: current.key === key && current.dir === 1 ? -1 : 1 }))

  const exportCsv = () => {
    const header = [
      'Tipo',
      'Título',
      'Dentro da tarefa',
      'Descrição',
      'Status',
      'Categoria',
      'Início',
      'Fim',
      'Dias',
      'Progresso',
    ]
    const lines = rows.map((row) => [
      row.kind === 'task' ? 'Tarefa' : 'Marco',
      row.title,
      row.parentTitle ?? '',
      row.description,
      statusById.get(row.statusId)?.name ?? '',
      row.categoryId ? (categoryById.get(row.categoryId)?.name ?? '') : '',
      row.start,
      row.kind === 'task' ? row.end : '',
      row.days ?? '',
      row.progress === null ? '' : `${row.progress}%`,
    ])
    const csv = [header, ...lines]
      .map((cells) => cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'timeline.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  if (rows.length === 0) {
    return (
      <div className="card flex flex-1 items-center justify-center p-12 text-center text-sm text-slate-500">
        Nenhum item corresponde aos filtros atuais.
      </div>
    )
  }

  return (
    <div className="card flex-1 overflow-auto">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {rows.length} {rows.length === 1 ? 'item' : 'itens'}
        </p>
        <button type="button" className="btn-ghost" onClick={exportCsv}>
          Exportar CSV
        </button>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
          <tr>
            <Th label="Tipo" sortKey="kind" sort={sort} onSort={toggleSort} />
            <Th label="Título" sortKey="title" sort={sort} onSort={toggleSort} />
            <Th label="Status" sortKey="status" sort={sort} onSort={toggleSort} />
            <Th label="Categoria" sortKey="category" sort={sort} onSort={toggleSort} />
            <Th label="Início" sortKey="start" sort={sort} onSort={toggleSort} />
            <Th label="Fim" sortKey="end" sort={sort} onSort={toggleSort} />
            <Th label="Dias" sortKey="days" sort={sort} onSort={toggleSort} className="text-right" />
            <th className="px-3 py-2 font-medium">Progresso</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const status = statusById.get(row.statusId)
            const category = row.categoryId ? categoryById.get(row.categoryId) : null
            return (
              <tr
                key={row.id}
                onClick={() => onOpen({ kind: row.kind, id: row.id })}
                className="cursor-pointer border-t border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
              >
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {row.kind === 'task' ? 'Tarefa' : 'Marco'}
                  </span>
                </td>
                <td className="max-w-xs px-3 py-2">
                  <p className="truncate font-medium">{row.title}</p>
                  {row.parentTitle ? (
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      ◆ em {row.parentTitle}
                    </p>
                  ) : null}
                  {row.description ? (
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{row.description}</p>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  {status ? <Badge label={status.name} color={status.color} /> : null}
                </td>
                <td className="px-3 py-2">
                  {category ? <Badge label={category.name} color={category.color} dot /> : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <p>{formatFull(row.start)}</p>
                  <p className="text-xs text-slate-400">{relativeToToday(row.start)}</p>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {row.kind === 'task' ? formatFull(row.end) : <span className="text-xs text-slate-400">—</span>}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">
                  {row.days ?? <span className="text-xs text-slate-400">—</span>}
                </td>
                <td className="w-32 px-3 py-2">
                  {row.progress === null ? (
                    <span className="text-xs text-slate-400">—</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${row.progress}%`,
                            backgroundColor: status?.color ?? '#04a5e5',
                          }}
                        />
                      </div>
                      <span className="w-9 text-right text-xs tabular-nums text-slate-500">
                        {row.progress}%
                      </span>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Th({
  label,
  sortKey,
  sort,
  onSort,
  className = '',
}: {
  label: string
  sortKey: SortKey
  sort: { key: SortKey; dir: 1 | -1 }
  onSort: (key: SortKey) => void
  className?: string
}) {
  const active = sort.key === sortKey
  return (
    <th className={`px-3 py-2 font-medium ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex cursor-pointer items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200"
      >
        {label}
        <span className={active ? 'opacity-100' : 'opacity-0'}>{sort.dir === 1 ? '▲' : '▼'}</span>
      </button>
    </th>
  )
}
