import { useRef, useState } from 'react'
import { useDatabase } from '../state/database'
import { ColorPicker } from './ui/ColorPicker'
import { exportToFile, importFromFile } from '../lib/storage'
import type { CategoryDef, StatusDef } from '../types'

export function SettingsView() {
  const {
    db,
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
  } = useDatabase()

  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  const counts = {
    tasks: db.tasks.length,
    milestones: db.milestones.length,
    dreams: db.dreams.length,
  }

  const handleImport = async (file: File | undefined) => {
    if (!file) return
    try {
      const imported = await importFromFile(file)
      if (
        !confirm(
          `Importar substitui a base atual (${counts.tasks} tarefas, ${counts.milestones} marcos, ${counts.dreams} sonhos). Continuar?`,
        )
      )
        return
      replaceDatabase(imported)
      setMessage({ tone: 'ok', text: 'Base importada com sucesso.' })
    } catch (error) {
      setMessage({ tone: 'error', text: `Falha ao importar: ${(error as Error).message}` })
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <div className="flex-1 space-y-5 overflow-auto pb-8">
      <section className="card p-5">
        <h2 className="text-sm font-semibold">Identificação</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Aparece no topo do site e no arquivo exportado.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="meta-title">
              Título
            </label>
            <input
              id="meta-title"
              className="field-input"
              value={db.meta.title}
              onChange={(event) => setMeta({ title: event.target.value })}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="meta-owner">
              Seu nome (opcional)
            </label>
            <input
              id="meta-owner"
              className="field-input"
              value={db.meta.owner}
              onChange={(event) => setMeta({ owner: event.target.value })}
            />
          </div>
        </div>
      </section>

      <section className="card p-5">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Status</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Crie, renomeie, recolora e reordene à vontade. Marcar como "encerrado" faz o item contar
              como concluído nos totais do topo.
            </p>
          </div>
          <button type="button" className="btn-ghost shrink-0" onClick={() => saveStatus({})}>
            + Novo status
          </button>
        </header>

        <ul className="mt-4 space-y-2">
          {db.statuses.map((status, index) => (
            <StatusRow
              key={status.id}
              status={status}
              isFirst={index === 0}
              isLast={index === db.statuses.length - 1}
              canDelete={db.statuses.length > 1}
              usage={
                db.tasks.filter((t) => t.statusId === status.id).length +
                db.milestones.filter((m) => m.statusId === status.id).length +
                db.dreams.filter((d) => d.statusId === status.id).length
              }
              onChange={(patch) => saveStatus({ id: status.id, ...patch })}
              onMove={(direction) => moveStatus(status.id, direction)}
              onDelete={() => {
                if (confirm(`Excluir o status "${status.name}"? Os itens vão para o primeiro status.`))
                  deleteStatus(status.id)
              }}
            />
          ))}
        </ul>
      </section>

      <section className="card p-5">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Categorias</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Agrupam as raias da timeline. Ao excluir, os itens ficam "Sem categoria" — nada é perdido.
            </p>
          </div>
          <button type="button" className="btn-ghost shrink-0" onClick={() => saveCategory({})}>
            + Nova categoria
          </button>
        </header>

        <ul className="mt-4 space-y-2">
          {db.categories.map((category, index) => (
            <CategoryRow
              key={category.id}
              category={category}
              isFirst={index === 0}
              isLast={index === db.categories.length - 1}
              usage={
                db.tasks.filter((t) => t.categoryId === category.id).length +
                db.milestones.filter((m) => m.categoryId === category.id).length +
                db.dreams.filter((d) => d.categoryId === category.id).length
              }
              onChange={(patch) => saveCategory({ id: category.id, ...patch })}
              onMove={(direction) => moveCategory(category.id, direction)}
              onDelete={() => {
                if (confirm(`Excluir a categoria "${category.name}"?`)) deleteCategory(category.id)
              }}
            />
          ))}
          {db.categories.length === 0 ? (
            <li className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-400 dark:border-slate-700">
              Nenhuma categoria ainda. Crie as suas quando decidir quais fazem sentido.
            </li>
          ) : null}
        </ul>
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-semibold">Seus dados</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Tudo fica no seu navegador (localStorage), nunca sai daqui e nunca é enviado a nenhum servidor.
          Limpar os dados do site apaga a base — exporte um backup de tempos em tempos.
        </p>

        <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
          {[
            ['Tarefas', counts.tasks],
            ['Marcos', counts.milestones],
            ['Sonhos', counts.dreams],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-slate-100 py-3 dark:bg-slate-800">
              <dd className="text-xl font-semibold tabular-nums">{value}</dd>
              <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
            </div>
          ))}
        </dl>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={() => exportToFile(db)}>
            Exportar JSON
          </button>
          <button type="button" className="btn-ghost" onClick={() => fileInput.current?.click()}>
            Importar JSON
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => handleImport(event.target.files?.[0])}
          />
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              if (confirm('Recarregar a base de exemplo? Sua base atual será substituída.'))
                resetToExample()
            }}
          >
            Carregar exemplo
          </button>
          <button
            type="button"
            className="btn-danger ml-auto"
            onClick={() => {
              if (confirm('Apagar TODAS as tarefas, marcos e sonhos? Status e categorias são mantidos.'))
                clearEverything()
            }}
          >
            Zerar base
          </button>
        </div>

        {message ? (
          <p
            className={`mt-3 text-sm ${
              message.tone === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {message.text}
          </p>
        ) : null}
      </section>
    </div>
  )
}

interface RowShellProps {
  isFirst: boolean
  isLast: boolean
  usage: number
  onMove: (direction: -1 | 1) => void
  onDelete: () => void
  canDelete?: boolean
  children: React.ReactNode
}

function RowShell({ isFirst, isLast, usage, onMove, onDelete, canDelete = true, children }: RowShellProps) {
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-2.5 dark:border-slate-800">
      {children}
      <span className="text-xs whitespace-nowrap text-slate-400" title="Itens usando isto">
        {usage} {usage === 1 ? 'item' : 'itens'}
      </span>
      <div className="ml-auto flex items-center gap-1">
        <IconButton label="Mover para cima" disabled={isFirst} onClick={() => onMove(-1)}>
          ↑
        </IconButton>
        <IconButton label="Mover para baixo" disabled={isLast} onClick={() => onMove(1)}>
          ↓
        </IconButton>
        <IconButton label="Excluir" disabled={!canDelete} onClick={onDelete} danger>
          ✕
        </IconButton>
      </div>
    </li>
  )
}

function StatusRow({
  status,
  onChange,
  ...shell
}: Omit<RowShellProps, 'children'> & {
  status: StatusDef
  onChange: (patch: Partial<StatusDef>) => void
}) {
  return (
    <RowShell {...shell}>
      <input
        className="field-input w-44"
        value={status.name}
        onChange={(event) => onChange({ name: event.target.value })}
        aria-label="Nome do status"
      />
      <ColorPicker value={status.color} onChange={(color) => onChange({ color })} />
      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <input
          type="checkbox"
          className="size-3.5 accent-sky-600"
          checked={Boolean(status.done)}
          onChange={(event) => onChange({ done: event.target.checked })}
        />
        encerrado
      </label>
    </RowShell>
  )
}

function CategoryRow({
  category,
  onChange,
  ...shell
}: Omit<RowShellProps, 'children'> & {
  category: CategoryDef
  onChange: (patch: Partial<CategoryDef>) => void
}) {
  return (
    <RowShell {...shell}>
      <input
        className="field-input w-44"
        value={category.name}
        onChange={(event) => onChange({ name: event.target.value })}
        aria-label="Nome da categoria"
      />
      <ColorPicker value={category.color} onChange={(color) => onChange({ color })} />
    </RowShell>
  )
}

function IconButton({
  children,
  label,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`size-7 cursor-pointer rounded-md border text-xs transition disabled:cursor-not-allowed disabled:opacity-30 ${
        danger
          ? 'border-rose-200 text-rose-500 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/40'
          : 'border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
      }`}
    >
      {children}
    </button>
  )
}
