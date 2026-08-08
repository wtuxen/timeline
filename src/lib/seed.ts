import type { Database } from '../types'
import { addISODays, today, toISO } from './dates'

export const DB_VERSION = 1

/**
 * Status pedidos no desenho inicial do projeto. Nada aqui é fixo no código:
 * o usuário edita, cria e remove tudo isso na aba Ajustes.
 */
export const DEFAULT_STATUSES = [
  { id: 'st-a-iniciar', name: 'A iniciar', color: '#9ca0b0' },
  { id: 'st-em-andamento', name: 'Em andamento', color: '#04a5e5' },
  { id: 'st-concluido', name: 'Concluído', color: '#40a02b', done: true },
  { id: 'st-cancelado', name: 'Cancelado', color: '#d20f39', done: true },
  { id: 'st-objetivo', name: 'Objetivo', color: '#8839ef' },
]

/** Ponto de partida sugerido — troque pelas suas próprias categorias. */
export const DEFAULT_CATEGORIES = [
  { id: 'cat-carreira', name: 'Carreira', color: '#7287fd' },
  { id: 'cat-financas', name: 'Finanças', color: '#179299' },
  { id: 'cat-saude', name: 'Saúde', color: '#e64553' },
  { id: 'cat-estudos', name: 'Estudos', color: '#df8e1d' },
  { id: 'cat-pessoal', name: 'Pessoal', color: '#ea76cb' },
  { id: 'cat-viagens', name: 'Viagens', color: '#209fb5' },
]

/**
 * Base de exemplo carregada no primeiro acesso. É genérica de propósito: serve
 * para a pessoa entender o formato e substituir pelos próprios itens.
 */
export function createSeedDatabase(): Database {
  const now = new Date().toISOString()
  const start = today()
  const stamps = { createdAt: now, updatedAt: now }
  const year = new Date().getFullYear()

  return {
    version: DB_VERSION,
    meta: { title: 'Minha timeline', owner: '', updatedAt: now },
    statuses: DEFAULT_STATUSES.map((s) => ({ ...s })),
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    tasks: [
      {
        id: 'task-exemplo-1',
        title: 'Exemplo: estruturar plano do ano',
        description:
          'Item de exemplo. Clique para editar, ou apague tudo em Ajustes → Zerar base e comece do zero.',
        start: addISODays(start, -10),
        end: addISODays(start, 20),
        statusId: 'st-em-andamento',
        categoryId: 'cat-pessoal',
        progress: 40,
        ...stamps,
      },
      {
        id: 'task-exemplo-2',
        title: 'Exemplo: curso de inglês',
        description: 'Tarefas têm início, fim, descrição, status, categoria e progresso.',
        start: addISODays(start, 5),
        end: addISODays(start, 120),
        statusId: 'st-a-iniciar',
        categoryId: 'cat-estudos',
        progress: 0,
        ...stamps,
      },
      {
        id: 'task-exemplo-3',
        title: 'Exemplo: reserva de emergência',
        description: 'Use o status "Objetivo" para blocos de intenção, sem execução definida ainda.',
        start: addISODays(start, -30),
        end: addISODays(start, 300),
        statusId: 'st-objetivo',
        categoryId: 'cat-financas',
        progress: 25,
        ...stamps,
      },
    ],
    milestones: [
      {
        id: 'ms-exemplo-1',
        title: 'Exemplo: revisão trimestral',
        description: 'Marcos são pontos no tempo — uma data só, sem duração.',
        date: addISODays(start, 45),
        statusId: 'st-a-iniciar',
        categoryId: 'cat-pessoal',
        taskId: null,
        ...stamps,
      },
      {
        id: 'ms-exemplo-2',
        title: `Exemplo: fechamento de ${year}`,
        description: '',
        date: toISO(new Date(year, 11, 31)),
        statusId: 'st-objetivo',
        categoryId: null,
        taskId: null,
        ...stamps,
      },
      {
        id: 'ms-exemplo-3',
        title: 'Exemplo: prova intermediária',
        description:
          'Marco dentro de uma tarefa: aparece na mesma linha da barra e anda junto quando você arrasta a tarefa.',
        date: addISODays(start, 60),
        statusId: 'st-a-iniciar',
        categoryId: 'cat-estudos',
        taskId: 'task-exemplo-2',
        ...stamps,
      },
    ],
    dreams: [
      {
        id: 'dream-exemplo-1',
        title: 'Exemplo: morar fora por um período',
        description: 'Sonhos não precisam de data — só de direção.',
        horizon: 'longo',
        targetYear: year + 5,
        categoryId: 'cat-viagens',
        statusId: 'st-objetivo',
        priority: 4,
        ...stamps,
      },
      {
        id: 'dream-exemplo-2',
        title: 'Exemplo: aprender a tocar um instrumento',
        description: '',
        horizon: 'algum-dia',
        targetYear: null,
        categoryId: 'cat-pessoal',
        statusId: null,
        priority: 2,
        ...stamps,
      },
    ],
  }
}

/** Base vazia, mantendo apenas status e categorias configurados. */
export function createEmptyDatabase(from?: Database): Database {
  const now = new Date().toISOString()
  return {
    version: DB_VERSION,
    meta: { title: from?.meta.title ?? 'Minha timeline', owner: from?.meta.owner ?? '', updatedAt: now },
    statuses: (from?.statuses ?? DEFAULT_STATUSES).map((s) => ({ ...s })),
    categories: (from?.categories ?? DEFAULT_CATEGORIES).map((c) => ({ ...c })),
    tasks: [],
    milestones: [],
    dreams: [],
  }
}
