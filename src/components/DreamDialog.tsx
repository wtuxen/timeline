import { useMemo, useState } from 'react'
import { Modal } from './ui/Modal'
import { useDatabase } from '../state/database'
import { HORIZON_LABELS, HORIZON_ORDER, type DreamHorizon, type ID } from '../types'

interface DreamDialogProps {
  id?: ID
  onClose: () => void
}

export function DreamDialog({ id, onClose }: DreamDialogProps) {
  const { db, saveDream, deleteDream } = useDatabase()
  const existing = useMemo(() => db.dreams.find((d) => d.id === id) ?? null, [db.dreams, id])

  const [title, setTitle] = useState(existing?.title ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [horizon, setHorizon] = useState<DreamHorizon>(existing?.horizon ?? 'algum-dia')
  const [targetYear, setTargetYear] = useState(existing?.targetYear ? String(existing.targetYear) : '')
  const [categoryId, setCategoryId] = useState<ID | null>(existing?.categoryId ?? null)
  const [statusId, setStatusId] = useState<ID | null>(existing?.statusId ?? null)
  const [priority, setPriority] = useState(existing?.priority ?? 3)
  const [error, setError] = useState('')

  const submit = () => {
    if (!title.trim()) {
      setError('Dê um título ao sonho.')
      return
    }
    saveDream({
      id,
      title: title.trim(),
      description: description.trim(),
      horizon,
      targetYear: targetYear ? Number(targetYear) : null,
      categoryId,
      statusId,
      priority,
    })
    onClose()
  }

  const remove = () => {
    if (!id) return
    if (!confirm('Excluir este sonho?')) return
    deleteDream(id)
    onClose()
  }

  return (
    <Modal
      title={existing ? 'Editar sonho' : 'Novo sonho'}
      onClose={onClose}
      footer={
        <>
          {id ? (
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
          <label className="field-label" htmlFor="dream-title">
            Sonho / objetivo futuro
          </label>
          <input
            id="dream-title"
            className="field-input"
            value={title}
            autoFocus
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex.: Ter uma casa no interior"
          />
        </div>

        <div>
          <label className="field-label" htmlFor="dream-description">
            Descrição
          </label>
          <textarea
            id="dream-description"
            className="field-input min-h-24 resize-y"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Por que isso importa? O que precisaria ser verdade?"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="dream-horizon">
              Horizonte
            </label>
            <select
              id="dream-horizon"
              className="field-input"
              value={horizon}
              onChange={(event) => setHorizon(event.target.value as DreamHorizon)}
            >
              {HORIZON_ORDER.map((value) => (
                <option key={value} value={value}>
                  {HORIZON_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="dream-year">
              Ano-alvo (opcional)
            </label>
            <input
              id="dream-year"
              type="number"
              min={1900}
              max={2200}
              className="field-input"
              value={targetYear}
              onChange={(event) => setTargetYear(event.target.value)}
              placeholder="—"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="dream-category">
              Categoria
            </label>
            <select
              id="dream-category"
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
          <div>
            <label className="field-label" htmlFor="dream-status">
              Status (opcional)
            </label>
            <select
              id="dream-status"
              className="field-input"
              value={statusId ?? ''}
              onChange={(event) => setStatusId(event.target.value || null)}
            >
              <option value="">Sem status</option>
              {db.statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="dream-priority">
            Prioridade: {'★'.repeat(priority)}
            {'☆'.repeat(5 - priority)}
          </label>
          <input
            id="dream-priority"
            type="range"
            min={1}
            max={5}
            value={priority}
            onChange={(event) => setPriority(Number(event.target.value))}
            className="w-full accent-sky-600"
          />
        </div>

        {error ? <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}
        <button type="submit" className="hidden" aria-hidden />
      </form>
    </Modal>
  )
}
