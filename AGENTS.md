<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Tabelle gestionale (design master)

La tabella della pagina **Lavorazioni** è il riferimento unico per tutte le liste dense.

- Shell: `GestionaleListTable` da `@/components/gestionale/global-table`
- Token: `@/lib/ui/gestionale-list-table` (`gestionaleListTableTd`, `gestionaleListTableRowClass`, colonna Azioni, …)
- Header sort: `GlobalTableSortTh` — titoli su **una riga** (`whitespace-nowrap`)
- Colonna Azioni: `GestionaleListTableActionsHead` + `gestionaleListTableTdAzioni` + `gestionaleListTableActionsGroup`

Non introdurre classi tabella locali (`prevTableTd`, thead custom, `text-sm` sulla table) salvo eccezioni documentate.

## Dev server (Turbopack / proxy)

- Default: `npm run dev` (Turbopack). `next.config.ts` imposta `turbopack.root` al progetto per evitare root inference errata.
- Se HMR crash su `proxy.ts` / `proxy-handler.ts` (`NextSegmentConfig no longer exists`): usare **`npm run dev:webpack`** temporaneamente mentre si lavora sull'edge auth/RBAC — non disabilitare Turbopack in modo permanente senza motivo.
- `proxy.ts`: `config.matcher` deve restare **string literal** (no `String.raw` / builder dinamici).
