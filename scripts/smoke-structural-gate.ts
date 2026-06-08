import fs from "node:fs";
import path from "node:path";
import { exitWithGate, printGateResult } from "../lib/ci/gate-output";

const GATE_NAME = "Smoke structural regression gate";
const ROOT = process.cwd();

type Finding = { file: string; line: number; rule: string; message: string };

const MODAL_SHELL_ANCHORS: { file: string; needles: string[] }[] = [
  {
    file: "components/gestionale/magazzino/magazzino-modals.tsx",
    needles: ["GestionaleModalShell"],
  },
  {
    file: "components/gestionale/lavorazioni/lavorazione-create-modal.tsx",
    needles: ["SchedaIngressoFormModalShell"],
  },
  {
    file: "components/gestionale/lavorazioni/lavorazioni-modals.tsx",
    needles: ["LavorazioniModalShell"],
  },
  {
    file: "components/gestionale/documenti/documenti-modals.tsx",
    needles: ["LavorazioniModalShell"],
  },
];

const REPORT_EXPORTS_REQUIRED = [
  "buildReportLavorazioniBundle",
  "monthKeysOverlappingRange",
];

function rel(file: string): string {
  return path.relative(ROOT, file).replace(/\\/g, "/");
}

function read(file: string): string {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function findLine(content: string, needle: string | RegExp): number {
  const lines = content.split("\n");
  const re = typeof needle === "string" ? new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) : needle;
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i] ?? "")) return i + 1;
  }
  return 1;
}

function scanPrevTableTd(): Finding[] {
  const findings: Finding[] = [];
  const dir = path.join(ROOT, "components", "gestionale");
  if (!fs.existsSync(dir)) return findings;

  function walk(d: string): void {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (/\.tsx$/.test(ent.name)) {
        const content = fs.readFileSync(full, "utf8");
        if (content.includes("prevTableTd")) {
          findings.push({
            file: rel(full),
            line: findLine(content, "prevTableTd"),
            rule: "table-master-tokens",
            message: "prevTableTd non ammesso nelle liste gestionale — usare gestionaleListTableTd.",
          });
        }
      }
    }
  }
  walk(dir);
  return findings;
}

function scanModalShell(): Finding[] {
  const findings: Finding[] = [];
  for (const anchor of MODAL_SHELL_ANCHORS) {
    if (!fs.existsSync(path.join(ROOT, anchor.file))) continue;
    const content = read(anchor.file);
    if (!anchor.needles.some((n) => content.includes(n))) {
      findings.push({
        file: anchor.file,
        line: 1,
        rule: "modal-shell",
        message: `Shell modale mancante (atteso uno di: ${anchor.needles.join(", ")})`,
      });
    }
  }
  return findings;
}

function scanAppShell(): Finding[] {
  const file = "components/gestionale/app-shell.tsx";
  const findings: Finding[] = [];
  if (!fs.existsSync(path.join(ROOT, file))) return findings;
  const content = read(file);
  for (const token of ["shellTopBarClass", "cab-nav-drawer-panel", "gestionale-scrollbar"]) {
    if (!content.includes(token)) {
      findings.push({
        file,
        line: findLine(content, token.slice(0, 12)),
        rule: "app-shell-layout",
        message: `Token layout mancante: ${token}`,
      });
    }
  }
  return findings;
}

function scanReportExports(): Finding[] {
  const file = "lib/report/lavorazioni-report-selectors.ts";
  const findings: Finding[] = [];
  if (!fs.existsSync(path.join(ROOT, file))) return findings;
  const content = read(file);
  for (const exp of REPORT_EXPORTS_REQUIRED) {
    if (!content.includes(`export function ${exp}`) && !content.includes(`export { ${exp}`)) {
      findings.push({
        file,
        line: 1,
        rule: "report-kpi-exports",
        message: `Export report mancante: ${exp}`,
      });
    }
  }
  return findings;
}

function scanKanbanMobile(): Finding[] {
  const board = "components/gestionale/lavorazioni/lavorazioni-kanban-mobile-board.tsx";
  const css = "components/gestionale/lavorazioni/lavorazioni-scroll.css";
  const findings: Finding[] = [];
  if (!fs.existsSync(path.join(ROOT, board))) return findings;
  const content = read(board);
  for (const cls of [
    "lavorazioni-kanban-mobile",
    "lavorazioni-kanban-mobile-section",
    "lavorazioni-kanban-mobile-panel",
  ]) {
    if (!content.includes(cls)) {
      findings.push({
        file: board,
        line: findLine(content, "lavorazioni-kanban"),
        rule: "kanban-mobile-structure",
        message: `Classe kanban mobile mancante: ${cls}`,
      });
    }
  }
  if (fs.existsSync(path.join(ROOT, css))) {
    const cssContent = read(css);
    if (!cssContent.includes("lavorazioni-kanban-mobile-panel")) {
      findings.push({
        file: css,
        line: 1,
        rule: "kanban-mobile-css",
        message: "Regole accordion kanban mobile assenti in lavorazioni-scroll.css",
      });
    }
  }
  return findings;
}

function main(): void {
  const findings = [
    ...scanPrevTableTd(),
    ...scanModalShell(),
    ...scanAppShell(),
    ...scanReportExports(),
    ...scanKanbanMobile(),
  ];

  const blockers = findings.map((f) => `${f.file}:${f.line} [${f.rule}] ${f.message}`);
  const status = blockers.length === 0 ? "PASS" : "FAIL";

  printGateResult({ name: GATE_NAME, status, blockers });
  exitWithGate(status);
}

main();
