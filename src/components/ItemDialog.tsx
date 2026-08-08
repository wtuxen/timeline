import { useMemo, useState } from 'react'
import { Modal } from './ui/Modal'
import { useDatabase } from '../state/database'
import type { ID, ISODate, Milestone, Task } from '../types'
import { durationInDays, relativeToToday, today } from '../lib/dates'

export type ItemKind = 'task' | 'milestone'

export interface ItemDialogTarget {
  kind: ItemKind
  /** Ausente = criação. */
  id?: ID
  /** Pré-preenchimento ao criar a partir de um clique na timeline. */
  defaults?: {
    start?: string
    end?: string
    date?: string
    categoryId?: ID | null
    /** Cria o marco já vinculado a uma tarefa. */
    taskId?: ID | null
  }
}

interface ItemDialogProps {
  target: ItemDialogTarget
  onClose: () => void
}

/** Linha do editor de marcos embutido na tarefa. Sem `id` = criada agora. */
interface MilestoneRow {
  key: string
  id?: ID
  title: string
  description: string
  date: ISODate
  statusId: ID
}

export function ItemDialog({ target, onClose }: ItemDialogProps) {
  const { db, saveTask, saveMilestone, deleteTask, deleteMilestone } = useDatabase()

  const existing = useMemo(() => {
    if (!target.id) return null
    return target.kind === 'task'
      ? (db.tasks.find((t) => t.id === target.id) ?? null)
      : (db.milestones.find((m) => m.id === target.id) ?? null)
  }, [db.tasks, db.milestones, target])

  const asTask = existing as Task | null
  const asMilestone = existing as Milestone | null
  const start = target.defaults?.start ?? today()
  const defaultStatus = db.statuses[0]?.id ?? ''

  const [title, setTitle] = useState(existing?.title ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [startDate, setStartDate] = useState(asTask?.start ?? start)
  const [endDate, setEndDate] = useState(asTask?.end ?? target.defaults?.end ?? start)
  const [date, setDate] = useState(asMilestone?.date ?? target.defaults?.date ?? start)
  const [statusId, setStatusId] = useState<ID>(existing?.statusId ?? defaultStatus)
  const [categoryId, setCategoryId] = useState<ID | null>(
    existing?.categoryId ?? target.defaults?.categoryId ?? null,
  )
  const [progress, setProgress] = useState(asTask?.progress ?? 0)
  const [taskId, setTaskId] = useState<ID | null>(
    asMilestone?.taskId ?? target.defaults?.taskId ?? null,
  )
  const [error, setError] = useState('')

  const isTask = target.kind === 'task'

  // Marcos já vinculados à tarefa que está aberta. Ficam em estado local e só
  // são gravados no "Salvar", junto com a tarefa — inclusive na criação, quando
  // o id da tarefa ainda não existe.
  const [rows, setRows] = useState<MilestoneRow[]>(() =>
    !isTask || !target.id
      ? []
      : db.milestones
          .filter((m) => m.taskId === target.id)
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((m) => ({
            key: m.id,
            id: m.id,
            title: m.title,
            description: m.description,
            date: m.date,
            statusId: m.statusId,
          })),
  )
  const [removedRows, setRemovedRows] = useState<ID[]>([])

  const days = isTask && startDate && endDate ? durationInDays(startDate, endDate) : 0

  /** Tarefas disponíveis para vincular um marco, da mais antiga para a mais nova. */
  const linkableTasks = useMemo(
    () => [...db.tasks].sort((a, b) => a.start.localeCompare(b.start)),
    [db.tasks],
  )
  const linkedTask = taskId ? (db.tasks.find((t) => t.id === taskId) ?? null) : null

  const patchRow = (key: string, values: Partial<MilestoneRow>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...values } : row)))

  const addRow = () =>
    setRows((current) => [
      ...current,
      {
        key: `new-${current.length}-${Math.random().toString(36).slice(2, 8)}`,
        title: '',
        description: '',
        date: endDate || startDate || today(),
        statusId,
      },
    ])

  const removeRow = (row: MilestoneRow) => {
    if (row.id) setRemovedRows((current) => [...current, row.id!])
    setRows((current) => current.filter((r) => r.key !== row.key))
  }

  const submit = () => {
    if (!title.trim()) {
      setError('Dê um título ao item.')
      return
    }
    if (isTask) {
      if (!startDate || !endDate) {
        setError('Informe início e fim.')
        return
      }
      if (endDate < startDate) {
        setError('A data de fim não pode ser anterior ao início.')
        return
      }
      if (rows.some((row) => !row.title.trim())) {
        setError('Dê um título a cada marco da tarefa, ou remova as linhas em branco.')
        return
      }
      if (rows.some((row) => !row.date)) {
        setError('Informe a data de cada marco da tarefa.')
        return
      }

      const saved = saveTask({
        id: target.id,
        title: title.trim(),
        description: description.trim(),
        start: startDate,
        end: endDate,
        statusId,
        categoryId,
        progress,
      })

      for (const id of removedRows) deleteMilestone(id)
      for (const row of rows) {
        saveMilestone({
          id: row.id,
          title: row.title.trim(),
          description: row.description,
          date: row.date,
          statusId: row.statusId,
          // Marco dentro da tarefa acompanha a categoria dela.
          categoryId,
          taskId: saved.id,
        })
      }
    } else {
      if (!date) {
        setError('Informe a data do marco.')
        return
      }
      saveMilestone({
        id: target.id,
        title: title.trim(),
        description: description.trim(),
        date,
        statusId,
        categoryId: linkedTask ? linkedTask.categoryId : categoryId,
        taskId,
      })
    }
    onClose()
  }

  const remove = () => {
    if (!target.id) return
    const attached = isTask ? rows.filter((row) => row.id).length : 0
    const warning = attached
      ? `\n\n${attached === 1 ? 'O marco vinculado vira um marco avulso' : `Os ${attached} marcos vinculados viram marcos avulsos`} — nada é apagado junto.`
      : ''
    if (!confirm(`Excluir este item? A ação não pode ser desfeita.${warning}`)) return
    if (isTask) deleteTask(target.id)
    else deleteMilestone(target.id)
    onClose()
  }

  const heading = `${existing ? 'Editar' : 'Nova'} ${isTask ? 'tarefa' : 'marco'}`

  return (
    <Modal
      title={heading}
      onClose={onClose}
      footer={
        <>
          {target.id ? (
            <button type="button" className="btn-danger mr-auto" onClick={remove}>
              Excluir
            </button>
          ) : null}
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={submit}>
            Salvar
          </button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <div>
          <label className="field-label" htmlFor="item-title">
            Título
          </label>
          <input
            id="item-title"
            className="field-input"
            value={title}
            autoFocus
            onChange={(event) => setTitle(event.target.value)}
            placeholder={isTask ? 'Ex.: Lançar o site pessoal' : 'Ex.: Entrega do TCC'}
          />
        </div>

        <div>
          <label className="field-label" htmlFor="item-description">
            Descrição
          </label>
          <textarea
            id="item-description"
            className="field-input min-h-24 resize-y"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Contexto, critério de pronto, links…"
          />
        </div>

        {isTask ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="field-label" htmlFor="item-start">
                Início
              </label>
              <input
                id="item-start"
                type="date"
                className="field-input"
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value)
                  if (event.target.value > endDate) setEndDate(event.target.value)
                }}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="item-end">
                Fim
              </label>
              <input
                id="item-end"
                type="date"
                className="field-input"
                value={endDate}
                min={startDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
            <div>
              <span className="field-label">Duração</span>
              <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800">
                {days > 0 ? `${days} ${days === 1 ? 'dia' : 'dias'}` : '—'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="item-date">
                Data
              </label>
              <input
                id="item-date"
                type="date"
                className="field-input"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div>
              <span className="field-label">Quando</span>
              <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800">
                {date ? relativeToToday(date) : '—'}
              </p>
            </div>
          </div>
        )}

        {!isTask ? (
          <div>
            <label className="field-label" htmlFor="item-task">
              Tarefa
            </label>
            <select
              id="item-task"
              className="field-input"
              value={taskId ?? ''}
              onChange={(event) => setTaskId(event.target.value || null)}
            >
              <option value="">Marco avulso (linha própria)</option>
              {linkableTasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
            {linkedTask ? (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Aparece como losango na linha da tarefa ({linkedTask.start} → {linkedTask.end}) e
                herda a categoria dela.
              </p>
            ) : null}
            {linkedTask && (date < linkedTask.start || date > linkedTask.end) ? (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                A data está fora do período da tarefa — o losango vai aparecer fora da barra.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="item-status">
              Status
            </label>
            <select
              id="item-status"
              className="field-input"
              value={statusId}
              onChange={(event) => setStatusId(event.target.value)}
            >
              {db.statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="item-category">
              Categoria
            </label>
            <select
              id="item-category"
              className="field-input disabled:opacity-60"
              value={(linkedTask ? linkedTask.categoryId : categoryId) ?? ''}
              disabled={Boolean(linkedTask)}
              onChange={(event) => setCategoryId(event.target.value || null)}
            >
              <option value="">Sem categoria</option>
              {db.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isTask ? (
          <>
            <div>
              <label className="field-label" htmlFor="item-progress">
                Progresso: {progress}%
              </label>
              <input
                id="item-progress"
                type="range"
                min={0}
                max={100}
                step={5}
                value={progress}
                onChange={(event) => setProgress(Number(event.target.value))}
                className="w-full accent-sky-600"
              />
            </div>

            <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Marcos da tarefa {rows.length ? `(${rows.length})` : ''}
                </span>
                <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={addRow}>
                  + Marco
                </button>
              </div>

              {rows.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pontos de checagem dentro desta tarefa. Eles aparecem como losangos na mesma linha
                  da barra e andam junto quando você arrasta a tarefa na timeline.
                </p>
              ) : (
                <ul className="space-y-2">
                  {rows.map((row) => {
                    const outside = row.date && (row.date < startDate || row.date > endDate)
                    return (
                      <li key={row.key}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            aria-hidden
                            className="size-2 shrink-0 rotate-45 rounded-[1px]"
                            style={{
                              backgroundColor:
                                db.statuses.find((s) => s.id === row.statusId)?.color ?? '#a855f7',
                            }}
                          />
                          <input
                            className="field-input min-w-0 flex-1 basis-32 px-2 py-1.5"
                            value={row.title}
                            placeholder="Ex.: primeira versão pronta"
                            onChange={(event) => patchRow(row.key, { title: event.target.value })}
                          />
                          <input
                            type="date"
                            className="field-input w-36 shrink-0 px-2 py-1.5"
                            value={row.date}
                            onChange={(event) => patchRow(row.key, { date: event.target.value })}
                          />
                          <select
                            className="field-input w-28 shrink-0 px-2 py-1.5"
                            value={row.statusId}
                            aria-label="Status do marco"
                            onChange={(event) => patchRow(row.key, { statusId: event.target.value })}
                          >
                            {db.statuses.map((status) => (
                              <option key={status.id} value={status.id}>
                                {status.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="btn-ghost shrink-0 px-2 py-1 text-xs"
                            aria-label={`Remover marco ${row.title || 'sem título'}`}
                            title="Remover marco"
                            onClick={() => removeRow(row)}
                          >
                            ✕
                          </button>
                        </div>
                        {outside ? (
                          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                            Fora do período da tarefa.
                          </p>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </>
        ) : null}

        {error ? <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}
        <button type="submit" className="hidden" aria-hidden />
      </form>
    </Modal>
  )
}
