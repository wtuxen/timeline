import { useMemo, useState } from 'react'
import { Modal } from './ui/Modal'
import { useDatabase } from '../state/database'
import type { ID, Milestone, Task } from '../types'
import { durationInDays, relativeToToday, today } from '../lib/dates'

export type ItemKind = 'task' | 'milestone'

export interface ItemDialogTarget {
  kind: ItemKind
  /** Ausente = criação. */
  id?: ID
  /** Pré-preenchimento ao criar a partir de um clique na timeline. */
  defaults?: { start?: string; end?: string; date?: string; categoryId?: ID | null }
}

interface ItemDialogProps {
  target: ItemDialogTarget
  onClose: () => void
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

  const [title, setTitle] = useState(existing?.title ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [startDate, setStartDate] = useState(asTask?.start ?? start)
  const [endDate, setEndDate] = useState(asTask?.end ?? target.defaults?.end ?? start)
  const [date, setDate] = useState(asMilestone?.date ?? target.defaults?.date ?? start)
  const [statusId, setStatusId] = useState<ID>(existing?.statusId ?? db.statuses[0]?.id ?? '')
  const [categoryId, setCategoryId] = useState<ID | null>(
    existing?.categoryId ?? target.defaults?.categoryId ?? null,
  )
  const [progress, setProgress] = useState(asTask?.progress ?? 0)
  const [error, setError] = useState('')

  const isTask = target.kind === 'task'
  const days = isTask && startDate && endDate ? durationInDays(startDate, endDate) : 0

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
      saveTask({
        id: target.id,
        title: title.trim(),
        description: description.trim(),
        start: startDate,
        end: endDate,
        statusId,
        categoryId,
        progress,
      })
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
        categoryId,
      })
    }
    onClose()
  }

  const remove = () => {
    if (!target.id) return
    if (!confirm('Excluir este item? A ação não pode ser desfeita.')) return
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
              className="field-input"
              value={categoryId ?? ''}
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
        ) : null}

        {error ? <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}
        <button type="submit" className="hidden" aria-hidden />
      </form>
    </Modal>
  )
}
