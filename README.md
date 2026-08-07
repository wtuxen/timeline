# Timeline

Site para organizar objetivos, planos, marcos e sonhos numa linha do tempo — com zoom por
dia, semana, mês, trimestre e ano, filtros por status e categoria, visão de tabela e um
painel separado para sonhos de longo prazo.

**O código é público; os dados não.** Tudo o que você cadastra fica no seu navegador e nunca
sai dele. Quem clonar este repositório começa com uma base de exemplo e monta a sua própria.

---

## Como usar

### Opção 1 — abrir o site publicado

Abra a URL do GitHub Pages, comece a cadastrar e pronto. A base fica no `localStorage` do seu
navegador, naquele dispositivo. Exporte um JSON de tempos em tempos como backup (Ajustes →
Exportar JSON).

### Opção 2 — gerar a sua própria cópia

1. Clique em **Use this template** → **Create a new repository** (ou faça um fork).
2. Em **Settings → Pages**, escolha **Source: GitHub Actions**. O workflow em
   `.github/workflows/deploy.yml` publica a cada push na `main`.
3. Abra o seu site e substitua os itens de exemplo pelos seus.

### Opção 3 — rodar localmente

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # gera dist/
npm run preview  # serve o dist/
```

---

## Onde ficam os seus dados

| Onde | O que é | Vai para o Git? |
| --- | --- | --- |
| `localStorage` do navegador | sua base de trabalho, salva a cada alteração | não |
| `timeline-AAAA-MM-DD.json` (export) | backup que você baixa quando quiser | não (está no `.gitignore`) |
| `public/data/timeline.json` | base inicial opcional, se você quiser versionar em outro lugar | **não** (está no `.gitignore`) |
| `public/data/timeline.example.json` | exemplo do formato, sem nada pessoal | sim |

A ordem de carregamento na primeira abertura é: `localStorage` → `public/data/timeline.json`
→ base de exemplo embutida.

### Quero versionar meus dados sem publicá-los

Três caminhos, do mais simples ao mais completo:

1. **Backup manual** — exporte o JSON pela aba Ajustes e guarde onde preferir (Drive, Dropbox,
   um repositório privado). Para restaurar em outro dispositivo: Ajustes → Importar JSON.
2. **Repositório privado só de dados** — crie um repo privado com o seu `timeline.json` e copie
   o arquivo para `public/data/` antes de rodar o build local. O `.gitignore` deste projeto já
   impede que ele seja commitado aqui por acidente.
3. **Fork privado** — se você não faz questão de manter o código público, um fork privado deixa
   commitar `public/data/timeline.json` sem expor nada (remova a linha correspondente do
   `.gitignore`).

> ⚠️ Se você publicar o site com um `public/data/timeline.json` dentro, o arquivo fica acessível
> por URL para qualquer pessoa. Só faça isso se o conteúdo puder ser público.

---

## O que dá para fazer

**Timeline** — visão principal. Barras com início e fim, marcos como losangos, raias agrupadas
por categoria, linha de "hoje", zoom em cinco níveis (Dia, Semana, Mês, Trimestre, Ano).
Arraste uma barra para mover a tarefa; arraste as pontas para mudar início ou fim; clique para
editar.

**Tabela** — os mesmos itens em lista ordenável por tipo, título, status, categoria, início, fim
e quantidade de dias, com exportação para CSV.

**Sonhos** — objetivos futuros sem data obrigatória, em quatro colunas de horizonte (curto,
médio, longo prazo e "algum dia"), com prioridade de 1 a 5 e ano-alvo opcional.

**Ajustes** — status e categorias são dados, não código: crie, renomeie, recolora, reordene ou
remova. Nada quebra ao excluir — os itens afetados migram para o primeiro status, ou ficam
"Sem categoria". Aqui também ficam exportação, importação e limpeza da base.

### Filtros

Busca por texto, status (múltipla escolha), categoria (múltipla escolha, incluindo "Sem
categoria"), recorte de período e alternância entre tarefas e marcos. Sem seleção = mostra
tudo. As preferências de visualização (aba, zoom, agrupamento, tema claro/escuro) ficam salvas
entre sessões.

---

## Formato dos dados

```jsonc
{
  "version": 1,
  "meta": { "title": "Minha timeline", "owner": "", "updatedAt": "..." },
  "statuses":   [{ "id": "st-x", "name": "Em andamento", "color": "#0ea5e9", "done": false }],
  "categories": [{ "id": "cat-x", "name": "Carreira", "color": "#6366f1" }],
  "tasks":      [{ "id": "task-x", "title": "…", "description": "…",
                   "start": "2026-01-05", "end": "2026-01-31",
                   "statusId": "st-x", "categoryId": "cat-x", "progress": 40 }],
  "milestones": [{ "id": "ms-x", "title": "…", "date": "2026-06-30",
                   "statusId": "st-x", "categoryId": "cat-x" }],
  "dreams":     [{ "id": "dream-x", "title": "…", "horizon": "longo",
                   "targetYear": 2031, "priority": 5,
                   "statusId": "st-x", "categoryId": "cat-x" }]
}
```

Datas são sempre `AAAA-MM-DD` e o intervalo é inclusivo (05/01 a 05/01 = 1 dia). `horizon`
aceita `curto`, `medio`, `longo` ou `algum-dia`. Na importação, campos ausentes ganham um
valor padrão e referências quebradas viram "sem categoria" em vez de derrubar a página — dá
para montar o JSON na mão ou gerar a partir de uma planilha sem medo.

---

## Estrutura

```
src/
  types.ts                    modelo de dados
  lib/dates.ts                aritmética de datas (sem dependências)
  lib/storage.ts              carga, gravação, importação e normalização
  lib/seed.ts                 base de exemplo e status/categorias padrão
  lib/filters.ts              regras de filtragem
  state/database.tsx          estado global e operações de escrita
  components/timeline/scale.ts   escala e ticks dos cinco níveis de zoom
  components/timeline/TimelineView.tsx
  components/TableView.tsx  DreamsView.tsx  SettingsView.tsx
```

Stack: React 19, TypeScript, Vite e Tailwind CSS 4. Sem backend, sem contas, sem rastreio.

## Licença

MIT — veja [LICENSE](LICENSE).
