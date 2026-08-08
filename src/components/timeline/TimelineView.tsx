import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { CategoryDef, ID, ISODate, Milestone, Task, ZoomLevel } from '../../types'
import { useDatabase } from '../../state/database'
import { buildScale } from './scale'
import { addISODays, durationInDays, formatFull, maxISO, minISO, today } from '../../lib/dates'
import { readableTextOn, withAlpha } from '../../lib/colors'
import type { ItemDialogTarget } from '../ItemDialog'

const LEFT_WIDTH = 264
const ROW_HEIGHT = 38
const GROUP_HEADER_HEIGHT = 32

interface TimelineViewProps {
  tasks: Task[]
  milestones: Milestone[]
  zoom: ZoomLevel
  groupByCategory: boolean
  focusToken: number
  onOpen: (target: ItemDialogTarget) => void
}

type DragMode = 'move' | 'start' | 'end'

interface DragState {
  id: ID
  mode: DragMode
  originX: number
  start: ISODate
  end: ISODate
  deltaDays: number
  moved: boolean
}

interface Group {
  key: string
  label: string
  color: string
  tasks: Task[]
  milestones: Milestone[]
}

export function TimelineView({
  tasks,
  milestones,
  zoom,
  groupByCategory,
  focusToken,
  onOpen,
}: TimelineViewProps) {
  const { db, statusById, categoryById, saveTask, shiftTaskMilestones } = useDatabase()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [hovered, setHovered] = useState<ID | null>(null)

  const scale = useMemo(() => {
    const dates: ISODate[] = [
      ...tasks.flatMap((t) => [t.start, t.end]),
      ...milestones.map((m) => m.date),
    ]
    const now = today()
    const minDate = dates.reduce((acc, d) => minISO(acc, d), dates[0] ?? now)
    const maxDate = dates.reduce((acc, d) => maxISO(acc, d), dates[0] ?? now)
    return buildScale({
      level: zoom,
      minDate: minISO(minDate, now),
      maxDate: maxISO(maxDate, now),
    })
  }, [tasks, milestones, zoom])

  /**
   * Marcos vinculados a uma tarefa visível saem da lista de linhas próprias e
   * viram losangos na linha da tarefa. Se a tarefa estiver escondida por um
   * filtro, o marco volta a aparecer sozinho em vez de sumir da tela.
   */
  const { inlineByTask, looseMilestones } = useMemo(() => {
    const taskIds = new Set(tasks.map((t) => t.id))
    const inline = new Map<ID, Milestone[]>()
    const loose: Milestone[] = []
    for (const milestone of milestones) {
      if (milestone.taskId && taskIds.has(milestone.taskId)) {
        const list = inline.get(milestone.taskId)
        if (list) list.push(milestone)
        else inline.set(milestone.taskId, [milestone])
      } else {
        loose.push(milestone)
      }
    }
    for (const list of inline.values()) list.sort((a, b) => a.date.localeCompare(b.date))
    return { inlineByTask: inline, looseMilestones: loose }
  }, [tasks, milestones])

  const groups = useMemo<Group[]>(() => {
    const byStart = (a: { start?: ISODate; date?: ISODate }, b: { start?: ISODate; date?: ISODate }) =>
      (a.start ?? a.date ?? '').localeCompare(b.start ?? b.date ?? '')

    if (!groupByCategory) {
      return [
        {
          key: 'all',
          label: 'Todos os itens',
          color: '#8c8fa1',
          tasks: [...tasks].sort(byStart),
          milestones: [...looseMilestones].sort((a, b) => a.date.localeCompare(b.date)),
        },
      ]
    }

    const buckets = new Map<string, Group>()
    const ensure = (category: CategoryDef | null) => {
      const key = category?.id ?? '__none__'
      if (!buckets.has(key)) {
        buckets.set(key, {
          key,
          label: category?.name ?? 'Sem categoria',
          color: category?.color ?? '#9ca0b0',
          tasks: [],
          milestones: [],
        })
      }
      return buckets.get(key)!
    }

    // Percorre as categorias na ordem definida em Ajustes para manter estabilidade.
    for (const category of db.categories) {
      if (
        tasks.some((t) => t.categoryId === category.id) ||
        looseMilestones.some((m) => m.categoryId === category.id)
      ) {
        ensure(category)
      }
    }
    for (const task of tasks) ensure(task.categoryId ? (categoryById.get(task.categoryId) ?? null) : null).tasks.push(task)
    for (const milestone of looseMilestones)
      ensure(milestone.categoryId ? (categoryById.get(milestone.categoryId) ?? null) : null).milestones.push(
        milestone,
      )

    return [...buckets.values()]
      .filter((group) => group.tasks.length > 0 || group.milestones.length > 0)
      .map((group) => ({
        ...group,
        tasks: group.tasks.sort(byStart),
        milestones: group.milestones.sort((a, b) => a.date.localeCompare(b.date)),
      }))
  }, [tasks, looseMilestones, groupByCategory, db.categories, categoryById])

  const scrollToToday = useCallback(() => {
    const container = scrollRef.current
    if (!container) return
    const x = scale.xOf(today())
    container.scrollTo({ left: Math.max(0, x - container.clientWidth / 2 + LEFT_WIDTH / 2) })
  }, [scale])

  useLayoutEffect(() => {
    scrollToToday()
    // Recentraliza sempre que o zoom muda ou o botão "Hoje" é acionado.
  }, [scrollToToday, focusToken])

  useEffect(() => {
    if (!drag) return

    const onMove = (event: PointerEvent) => {
      const dx = event.clientX - drag.originX
      const deltaDays = scale.daysFromPx(dx)
      setDrag((current) =>
        current && (current.deltaDays !== deltaDays || (!current.moved && Math.abs(dx) > 3))
          ? { ...current, deltaDays, moved: current.moved || Math.abs(dx) > 3 }
          : current,
      )
    }

    const onUp = () => {
      setDrag((current) => {
        if (!current) return null
        if (!current.moved) {
          onOpen({ kind: 'task', id: current.id })
        } else if (current.deltaDays !== 0) {
          const next = applyDrag(current)
          saveTask({ id: current.id, start: next.start, end: next.end })
          // Mover a tarefa inteira leva junto os marcos que moram nela;
          // esticar só uma ponta mexe no prazo, não nos pontos de checagem.
          if (current.mode === 'move') shiftTaskMilestones(current.id, current.deltaDays)
        }
        return null
      })
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [drag, scale, saveTask, shiftTaskMilestones, onOpen])

  const startDrag = (event: React.PointerEvent, task: Task, mode: DragMode) => {
    if (event.button !== 0) return
    event.preventDefault()
    setDrag({
      id: task.id,
      mode,
      originX: event.clientX,
      start: task.start,
      end: task.end,
      deltaDays: 0,
      moved: false,
    })
  }

  const totalRows = groups.reduce((sum, g) => sum + g.tasks.length + g.milestones.length, 0)
  const bodyHeight = totalRows * ROW_HEIGHT + groups.length * (groupByCategory ? GROUP_HEADER_HEIGHT : 0)
  const todayX = scale.xOf(today())
  const showTodayLine = todayX >= 0 && todayX <= scale.width

  if (totalRows === 0) {
    return (
      <EmptyTimeline
        onCreate={() => onOpen({ kind: 'task', defaults: { start: today(), end: addISODays(today(), 14) } })}
      />
    )
  }

  return (
    <div
      ref={scrollRef}
      className="card relative flex-1 overflow-auto"
      style={{ cursor: drag?.moved ? 'grabbing' : undefined }}
    >
      <div style={{ width: LEFT_WIDTH + scale.width, minWidth: '100%' }}>
        {/* Cabeçalho de duas linhas: agrupador (mês/ano/década) + colunas. */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur dark:bg-slate-900/95">
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <div className="sticky left-0 z-10 shrink-0 border-r border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
              style={{ width: LEFT_WIDTH }}
            >
              Item
            </div>
            <div className="relative" style={{ width: scale.width, height: 26 }}>
              {scale.groups.map((group) => (
                <div
                  key={group.key}
                  className="absolute top-0 flex h-full items-center border-l border-slate-200 dark:border-slate-800"
                  style={{ left: group.x, width: group.width }}
                >
                  {/* `sticky` mantém o rótulo visível enquanto o período rola por
                      baixo da coluna fixa de itens, sem transbordar do período. */}
                  <span
                    className={`sticky max-w-full truncate px-2 text-xs font-semibold whitespace-nowrap ${
                      group.isCurrent
                        ? 'text-sky-600 dark:text-sky-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                    style={{ left: LEFT_WIDTH }}
                  >
                    {group.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <div
              className="sticky left-0 z-10 shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
              style={{ width: LEFT_WIDTH }}
            />
            <div className="relative" style={{ width: scale.width, height: 24 }}>
              {scale.columns.map((column) => (
                <div
                  key={column.key}
                  className={`absolute top-0 flex h-full items-center justify-center overflow-hidden border-l text-[11px] whitespace-nowrap ${
                    column.isCurrent
                      ? 'border-sky-400 font-semibold text-sky-600 dark:text-sky-400'
                      : 'border-slate-200 text-slate-400 dark:border-slate-800 dark:text-slate-500'
                  } ${column.isWeekend ? 'bg-slate-100/70 dark:bg-slate-800/40' : ''}`}
                  style={{ left: column.x, width: column.width }}
                >
                  {column.width > 22 ? column.label : ''}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* `minHeight` faz a malha de fundo descer até o rodapé do painel mesmo
            com poucos itens, em vez de terminar na última linha. */}
        <div className="relative" style={{ height: bodyHeight, minHeight: 'calc(100vh - 260px)' }}>
          {/* Malha de fundo desenhada uma única vez, atrás de todas as linhas. */}
          <div
            className="pointer-events-none absolute inset-y-0"
            style={{ left: LEFT_WIDTH, width: scale.width }}
          >
            {scale.columns.map((column) => (
              <div
                key={column.key}
                className={`absolute inset-y-0 border-l border-slate-200/70 dark:border-slate-800/70 ${
                  column.isWeekend ? 'bg-slate-100/60 dark:bg-slate-800/30' : ''
                }`}
                style={{ left: column.x, width: column.width }}
              />
            ))}
            {showTodayLine ? (
              <div
                className="absolute inset-y-0 z-10 w-px bg-sky-500"
                style={{ left: todayX }}
                title={`Hoje — ${formatFull(today())}`}
              />
            ) : null}
          </div>

          {(() => {
            let offset = 0
            return groups.map((group) => {
              const header = groupByCategory ? (
                <div
                  key={`${group.key}-header`}
                  className="absolute left-0 flex items-center"
                  style={{ top: offset, height: GROUP_HEADER_HEIGHT, width: LEFT_WIDTH + scale.width }}
                >
                  <div
                    className="sticky left-0 z-10 flex h-full shrink-0 items-center gap-2 border-r border-b border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-900"
                    style={{ width: LEFT_WIDTH }}
                  >
                    <span className="size-2 rounded-full" style={{ backgroundColor: group.color }} />
                    <span
                      className="tinted-text truncate text-xs font-semibold tracking-wide uppercase"
                      style={{ '--tint-color': group.color } as CSSProperties}
                    >
                      {group.label}
                    </span>
                    <span className="ml-auto text-[11px] text-slate-400">
                      {group.tasks.length + group.milestones.length}
                    </span>
                  </div>
                  <div className="h-full flex-1 border-b border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/20" />
                </div>
              ) : null

              if (groupByCategory) offset += GROUP_HEADER_HEIGHT

              const rows = [
                ...group.tasks.map((task) => {
                  const top = offset
                  offset += ROW_HEIGHT
                  return renderTaskRow(task, top)
                }),
                ...group.milestones.map((milestone) => {
                  const top = offset
                  offset += ROW_HEIGHT
                  return renderMilestoneRow(milestone, top)
                }),
              ]

              return (
                <div key={group.key}>
                  {header}
                  {rows}
                </div>
              )
            })
          })()}
        </div>
      </div>
    </div>
  )

  function renderTaskRow(task: Task, top: number) {
    const isDragging = drag?.id === task.id
    const preview = isDragging && drag ? applyDrag(drag) : { start: task.start, end: task.end }
    const inline = inlineByTask.get(task.id) ?? []
    // Arrastar a tarefa inteira arrasta os losangos junto, ainda em pré-visualização.
    const shift = isDragging && drag?.mode === 'move' ? drag.deltaDays : 0
    const status = statusById.get(task.statusId)
    const category = task.categoryId ? categoryById.get(task.categoryId) : null
    const color = status?.color ?? '#8c8fa1'
    const x = scale.xOf(preview.start)
    const width = scale.widthOf(preview.start, preview.end)
    const days = durationInDays(preview.start, preview.end)
    const showLabelInside = width > 72

    return (
      <div
        key={task.id}
        className="group absolute left-0 flex items-center"
        style={{ top, height: ROW_HEIGHT, width: LEFT_WIDTH + scale.width }}
        onMouseEnter={() => setHovered(task.id)}
        onMouseLeave={() => setHovered((current) => (current === task.id ? null : current))}
      >
        <div
          className={`sticky left-0 z-10 flex h-full shrink-0 cursor-pointer items-center gap-2 border-r border-b border-slate-100 bg-white px-3 dark:border-slate-800 dark:bg-slate-900 ${
            hovered === task.id ? 'bg-slate-50 dark:bg-slate-800/60' : ''
          }`}
          style={{ width: LEFT_WIDTH }}
          onClick={() => onOpen({ kind: 'task', id: task.id })}
          title={task.description || task.title}
        >
          <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <span className="truncate text-sm">{task.title}</span>
          {inline.length ? (
            <span
              className="shrink-0 text-[11px] whitespace-nowrap text-slate-400"
              title={`${inline.length} ${inline.length === 1 ? 'marco nesta tarefa' : 'marcos nesta tarefa'}`}
            >
              ◆ {inline.length}
            </span>
          ) : null}
          <button
            type="button"
            className="shrink-0 cursor-pointer rounded px-1 text-xs text-slate-400 opacity-0 transition group-hover:opacity-100 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100"
            title="Adicionar marco nesta tarefa"
            aria-label={`Adicionar marco na tarefa ${task.title}`}
            onClick={(event) => {
              event.stopPropagation()
              onOpen({
                kind: 'milestone',
                defaults: { date: task.end, taskId: task.id, categoryId: task.categoryId },
              })
            }}
          >
            +◆
          </button>
          {category ? (
            <span
              className="ml-auto size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: category.color }}
              title={category.name}
            />
          ) : null}
        </div>

        <div className="relative h-full flex-1 border-b border-slate-100 dark:border-slate-800">
          <div
            className="group/bar absolute top-1/2 flex h-6 -translate-y-1/2 items-center rounded-md shadow-sm transition-shadow select-none hover:shadow-md"
            style={{
              left: x,
              width,
              backgroundColor: withAlpha(color, 0.9),
              borderLeft: category ? `3px solid ${category.color}` : undefined,
              cursor: drag?.id === task.id && drag.moved ? 'grabbing' : 'grab',
            }}
            onPointerDown={(event) => startDrag(event, task, 'move')}
            title={`${task.title}\n${formatFull(preview.start)} → ${formatFull(preview.end)} (${days} ${days === 1 ? 'dia' : 'dias'})${task.description ? `\n\n${task.description}` : ''}`}
          >
            {task.progress ? (
              <div
                className="absolute inset-y-0 left-0 rounded-l-md bg-white/25"
                style={{ width: `${task.progress}%` }}
              />
            ) : null}

            <span
              className="pointer-events-none relative truncate px-2 text-xs font-medium"
              style={{ color: showLabelInside ? readableTextOn(color) : 'transparent' }}
            >
              {task.title}
            </span>

            <span
              className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize rounded-l-md opacity-0 transition group-hover/bar:opacity-100 hover:bg-black/25"
              onPointerDown={(event) => {
                event.stopPropagation()
                startDrag(event, task, 'start')
              }}
            />
            <span
              className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize rounded-r-md opacity-0 transition group-hover/bar:opacity-100 hover:bg-black/25"
              onPointerDown={(event) => {
                event.stopPropagation()
                startDrag(event, task, 'end')
              }}
            />
          </div>

          {inline.map((milestone) => {
            const milestoneDate = shift ? addISODays(milestone.date, shift) : milestone.date
            const milestoneColor = statusById.get(milestone.statusId)?.color ?? '#a855f7'
            const milestoneX = scale.xOf(milestoneDate) + Math.min(scale.pxPerDay, 40) / 2
            return (
              <button
                key={milestone.id}
                type="button"
                className="absolute top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center"
                style={{ left: milestoneX, width: 18, height: 18 }}
                // O losango fica por cima da barra: sem isto, clicar nele iniciaria
                // o arraste da tarefa em vez de abrir o marco.
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation()
                  onOpen({ kind: 'milestone', id: milestone.id })
                }}
                title={`${milestone.title}\n${formatFull(milestoneDate)} · em ${task.title}${milestone.description ? `\n\n${milestone.description}` : ''}`}
              >
                <span
                  className="block size-2.5 rotate-45 rounded-[2px] shadow-sm ring-2 ring-white transition hover:scale-125 dark:ring-slate-900"
                  style={{ backgroundColor: milestoneColor }}
                />
              </button>
            )
          })}

          {!showLabelInside ? (
            <span
              className="pointer-events-none absolute top-1/2 -translate-y-1/2 pl-1.5 text-xs whitespace-nowrap text-slate-600 dark:text-slate-300"
              style={{ left: x + width }}
            >
              {task.title}
            </span>
          ) : null}
        </div>
      </div>
    )
  }

  function renderMilestoneRow(milestone: Milestone, top: number) {
    const status = statusById.get(milestone.statusId)
    const category = milestone.categoryId ? categoryById.get(milestone.categoryId) : null
    const color = status?.color ?? '#8839ef'
    const x = scale.xOf(milestone.date) + Math.min(scale.pxPerDay, 40) / 2

    return (
      <div
        key={milestone.id}
        className="absolute left-0 flex items-center"
        style={{ top, height: ROW_HEIGHT, width: LEFT_WIDTH + scale.width }}
        onMouseEnter={() => setHovered(milestone.id)}
        onMouseLeave={() => setHovered((current) => (current === milestone.id ? null : current))}
      >
        <div
          className={`sticky left-0 z-10 flex h-full shrink-0 cursor-pointer items-center gap-2 border-r border-b border-slate-100 bg-white px-3 dark:border-slate-800 dark:bg-slate-900 ${
            hovered === milestone.id ? 'bg-slate-50 dark:bg-slate-800/60' : ''
          }`}
          style={{ width: LEFT_WIDTH }}
          onClick={() => onOpen({ kind: 'milestone', id: milestone.id })}
          title={milestone.description || milestone.title}
        >
          <span className="shrink-0 rotate-45" style={{ width: 8, height: 8, backgroundColor: color }} />
          <span className="truncate text-sm italic">{milestone.title}</span>
          {category ? (
            <span
              className="ml-auto size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: category.color }}
              title={category.name}
            />
          ) : null}
        </div>

        <div className="relative h-full flex-1 border-b border-slate-100 dark:border-slate-800">
          <button
            type="button"
            className="absolute top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center"
            style={{ left: x, width: 18, height: 18 }}
            onClick={() => onOpen({ kind: 'milestone', id: milestone.id })}
            title={`${milestone.title}\n${formatFull(milestone.date)}${milestone.description ? `\n\n${milestone.description}` : ''}`}
          >
            <span
              className="block size-3 rotate-45 rounded-[2px] shadow-sm transition hover:scale-125"
              style={{ backgroundColor: color, outline: `2px solid ${withAlpha(color, 0.25)}` }}
            />
          </button>
          <span
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 pl-3 text-xs whitespace-nowrap text-slate-500 dark:text-slate-400"
            style={{ left: x + 8 }}
          >
            {milestone.title}
          </span>
        </div>
      </div>
    )
  }
}

/** Aplica o deslocamento do arraste em curso, sem deixar o fim anteceder o início. */
function applyDrag(drag: DragState): { start: ISODate; end: ISODate } {
  const { mode, deltaDays, start, end } = drag
  if (mode === 'move') {
    return { start: addISODays(start, deltaDays), end: addISODays(end, deltaDays) }
  }
  if (mode === 'start') {
    return { start: minISO(addISODays(start, deltaDays), end), end }
  }
  return { start, end: maxISO(addISODays(end, deltaDays), start) }
}

function EmptyTimeline({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="card flex flex-1 flex-col items-center justify-center gap-3 p-12 text-center">
      <p className="text-4xl">🗺️</p>
      <h2 className="text-lg font-semibold">Nada por aqui ainda</h2>
      <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
        Nenhum item corresponde aos filtros atuais. Crie uma tarefa ou limpe os filtros para ver o que
        já existe.
      </p>
      <button type="button" className="btn-primary mt-1" onClick={onCreate}>
        Criar primeira tarefa
      </button>
    </div>
  )
}
