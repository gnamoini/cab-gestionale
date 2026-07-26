import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

/** Static import specifiers only (excludes dynamic import() string paths). */
function staticImportSpecifiers(source: string): string[] {
  const out: string[] = [];
  const lines = source.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("import ")) continue;
    const fromMatch = trimmed.match(/\bfrom\s+["']([^"']+)["']/);
    if (fromMatch) out.push(fromMatch[1]!);
    const sideEffect = trimmed.match(/^import\s+["']([^"']+)["']/);
    if (sideEffect && !fromMatch) out.push(sideEffect[1]!);
  }
  return out;
}

const view = read("components/gestionale/lavorazioni/lavorazioni-view.tsx");
const kanbanView = read("components/gestionale/lavorazioni/lavorazioni-kanban-view.tsx");
const kanbanLazy = read("components/gestionale/lavorazioni/lavorazioni-kanban-lazy.tsx");
const lazyPanels = read("components/gestionale/lavorazioni/lavorazioni-kanban-lazy-panels.tsx");

const viewImports = staticImportSpecifiers(view);

// KANBAN_ISOLATION_POLICY — rule 1: parent must not statically import Kanban domain
for (const spec of viewImports) {
  assert.ok(
    !spec.includes("lavorazioni-kanban"),
    `lavorazioni-view.tsx must not statically import Kanban modules: ${spec}`,
  );
  assert.ok(
    !spec.includes("use-kanban"),
    `lavorazioni-view.tsx must not import Kanban hooks: ${spec}`,
  );
  assert.ok(!spec.includes("@dnd-kit"), `lavorazioni-view.tsx must not import @dnd-kit: ${spec}`);
}

assert.match(view, /LavorazioniKanbanView = dynamic/);
assert.match(view, /lavorazioni-kanban-lazy/);
assert.match(view, /listViewMode === "kanban"/);
assert.doesNotMatch(view, /useKanbanViewportLayout/);
assert.doesNotMatch(view, /LoadingKanbanSkeleton/);
assert.doesNotMatch(view, /\/lavorazioni:kanban/);

// rule 2: Kanban view owns viewport + autonomy context
assert.match(kanbanView, /useKanbanViewportLayout/);
assert.match(kanbanView, /useUIAutonomyFixEngine\(\s*["']\/lavorazioni:kanban["']/);
assert.doesNotMatch(kanbanView, /lavorazioni-kanban-dnd/);
assert.match(kanbanView, /LavorazioniKanbanDesktopBoardLazy/);
assert.doesNotMatch(kanbanView, /from "@\/components\/design-system"/);
assert.match(kanbanView, /loading-kanban-skeleton/);
assert.doesNotMatch(kanbanView, /lavorazioni-inline-select/);

// lazy barrel isolates skeleton + inner view chunk
assert.match(kanbanLazy, /LoadingKanbanSkeleton/);
assert.match(kanbanLazy, /lavorazioni-kanban-view/);

// P1 — DnD desktop lazy panel
assert.match(lazyPanels, /LavorazioniKanbanDesktopBoardLazy = dynamic/);
assert.match(lazyPanels, /lavorazioni-kanban-desktop-board/);

console.log("lavorazioni-kanban-perf-policy.test.ts OK");
