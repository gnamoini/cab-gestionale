import fs from "node:fs";
import path from "node:path";
import { exitWithGate, printGateResult } from "../lib/ci/gate-output";

const GATE_NAME = "UX mobile regression gate";

type Severity = "blocker" | "warning";

type Finding = {
  severity: Severity;
  file: string;
  line: number;
  rule: string;
  message: string;
};

const ROOT = process.cwd();
const SRC_DIRS = ["app", "components", "context", "lib", "src"];
const SKIP_DIRS = new Set([".git", ".next", "node_modules", "dist", "build", "coverage"]);
const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx"]);
const STYLE_EXT = new Set([".css"]);

function loadUxToastAllowlist(): Set<string> {
  const out = new Set<string>();
  const sources = [
    {
      file: path.join(ROOT, "src", "lib", "ux", "interaction-enforcement.ts"),
      regex: /UX_TOAST_CALLER_ALLOWLIST\s*=\s*\[([\s\S]*?)\]\s*as const/,
    },
    {
      file: path.join(ROOT, "scripts", "ux-enforcement-check.ts"),
      regex: /ALLOWED_USE_TOAST\s*=\s*new Set\(\[([\s\S]*?)\]\)/,
    },
  ];
  for (const source of sources) {
    if (!fs.existsSync(source.file)) continue;
    const content = fs.readFileSync(source.file, "utf8");
    const m = content.match(source.regex);
    if (!m) continue;
    for (const entry of m[1].matchAll(/"([^"]+)"/g)) {
      out.add(entry[1]);
    }
  }
  return out;
}

const UX_TOAST_ALLOWLIST = loadUxToastAllowlist();

function rel(file: string): string {
  return path.relative(ROOT, file).replace(/\\/g, "/");
}

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
      continue;
    }
    const ext = path.extname(entry.name);
    if (CODE_EXT.has(ext) || STYLE_EXT.has(ext)) out.push(full);
  }
  return out;
}

function findLine(content: string, pattern: RegExp): number {
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    if (pattern.test(lines[i] ?? "")) return i + 1;
  }
  return 1;
}

function parseTailwindSizeUnits(line: string): number[] {
  const values: number[] = [];
  const re = /\b(?:min-)?[hw]-(\d+(?:\.\d+)?)\b/g;
  let m: RegExpExecArray | null = null;
  while ((m = re.exec(line)) !== null) {
    const v = Number(m[1]);
    if (Number.isFinite(v)) values.push(v);
  }
  return values;
}

function scanFile(file: string): Finding[] {
  const fileRel = rel(file);
  const findings: Finding[] = [];
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    const n = i + 1;

    if (line.includes("window.alert(") || line.includes("window.confirm(") || line.includes("window.prompt(")) {
      findings.push({
        severity: "blocker",
        file: fileRel,
        line: n,
        rule: "legacy-dialog",
        message: "Uso legacy dialog API vietato (window.alert/confirm/prompt).",
      });
    }

    if (/\buseToast\s*\(/.test(line) && !UX_TOAST_ALLOWLIST.has(fileRel)) {
      findings.push({
        severity: "blocker",
        file: fileRel,
        line: n,
        rule: "direct-use-toast",
        message: "useToast diretto fuori allowlist UX.",
      });
    }
  }

  const isTooltipCoreFile = fileRel.endsWith("components/design-system/use-tooltip.ts");
  if (isTooltipCoreFile) {
    const hasCoarseGuard = content.includes("(hover: none)") || content.includes("pointer: coarse");
    if (!hasCoarseGuard) {
      findings.push({
        severity: "blocker",
        file: fileRel,
        line: findLine(content, /onMouseEnter|pointer|hover/),
        rule: "tooltip-mobile-guard",
        message: "Tooltip hover/click senza guard mobile (hover:none/pointer:coarse).",
      });
    }
  }

  const definesFixedOverlayDialog = /className=.*\bfixed\b/.test(content) && content.includes('role="dialog"');
  if (definesFixedOverlayDialog) {
    const hasBodyScrollLock =
      content.includes("useBodyScrollLock(") ||
      content.includes("useGestionaleMainScrollLock(") ||
      content.includes("BODY_LOCK_ATTR");
    if (!hasBodyScrollLock) {
      findings.push({
        severity: "blocker",
        file: fileRel,
        line: findLine(content, /role="dialog"|fixed/),
        rule: "modal-scroll-lock",
        message: "Modal/Drawer senza hook scroll-lock condiviso.",
      });
    }
    const overlayBackExcluded =
      /global-calendar-panel|settings-color-picker-popover|timesheet-cell-editor-popover/i.test(fileRel);
    const hasOverlayBack =
      content.includes("useOverlayBackHandler(") ||
      content.includes("GestionaleConfirmDialog") ||
      content.includes("OverlayBackStackGuard");
    if (hasBodyScrollLock && !overlayBackExcluded && !hasOverlayBack) {
      findings.push({
        severity: "blocker",
        file: fileRel,
        line: findLine(content, /useBodyScrollLock/),
        rule: "modal-overlay-back",
        message: "Overlay con scroll-lock deve usare useOverlayBackHandler (pulsante Indietro mobile).",
      });
    }
    const mobileOnlyDrawer =
      /mobile-filter-drawer|cab-nav-drawer-panel|MobileNavDrawer/i.test(fileRel) ||
      (fileRel.endsWith("app-shell.tsx") && content.includes("md:hidden"));
    if (
      !mobileOnlyDrawer &&
      /max-w-\[100vw\]/.test(content) &&
      !/max-md:max-w-none/.test(content) &&
      !content.includes("resolveModalMaxWidthClass") &&
      !content.includes("dsLavorazioniModalDialog") &&
      !content.includes("dsModalPanel")
    ) {
      findings.push({
        severity: "warning",
        file: fileRel,
        line: findLine(content, /max-w-\[100vw\]/),
        rule: "modal-desktop-fullwidth",
        message:
          "Dialog con max-w-[100vw] senza variant mobile/desktop: su desktop la modale risulta fullscreen. Usare token modale o resolveModalMaxWidthClass.",
      });
    }
  }

  const criticalScrollContainer =
    /kanban/i.test(fileRel) ||
    fileRel.endsWith("components/gestionale/lavorazioni/lavorazioni-scroll.css") ||
    fileRel.endsWith("components/gestionale/global-table/gestionale-list-table-shell.tsx");
  const hasOverflowScroll = /overflow(?:-[xy])?-(?:auto|scroll)/.test(content);
  const hasOverscrollContain =
    /overscroll(?:-[xy])?-(?:contain|none)/.test(content) ||
    /overscroll-behavior(?:-[xy])?\s*:\s*(contain|none)/.test(content);
  if (criticalScrollContainer && hasOverflowScroll && !hasOverscrollContain) {
    findings.push({
      severity: "blocker",
      file: fileRel,
      line: findLine(content, /overflow(?:-[xy])?-(?:auto|scroll)/),
      rule: "scroll-containment",
      message: "Container critico scrollabile senza overscroll containment.",
    });
  }

  const hasMitigation = /touch-action|scrollbar-gutter|contain:/.test(content) || content.includes("lavorazioni-scroll.css");
  if (criticalScrollContainer && /overflow(?:-[xy])?-(?:auto|scroll)/.test(content) && !hasMitigation) {
    findings.push({
      severity: "blocker",
      file: fileRel,
      line: findLine(content, /overflow(?:-[xy])?-(?:auto|scroll)/),
      rule: "scroll-chaining-risk",
      message: "Potenziale scroll chaining non mitigato su liste/kanban critici.",
    });
  }

  if (content.includes("fixed") && !content.includes("safe-area-inset") && /mobile|drawer|header|modal|sheet/i.test(fileRel)) {
    findings.push({
      severity: "warning",
      file: fileRel,
      line: findLine(content, /fixed/),
      rule: "safe-area-fixed",
      message: "Uso di fixed senza safe-area handling esplicito (heuristic).",
    });
  }

  if (hasOverflowScroll) {
    const overflowMentions = (content.match(/overflow(?:-[xy])?-(?:auto|scroll)/g) ?? []).length;
    if (overflowMentions > 2) {
      findings.push({
        severity: "warning",
        file: fileRel,
        line: findLine(content, /overflow(?:-[xy])?-(?:auto|scroll)/),
        rule: "nested-scroll-depth",
        message: "Nesting scroll container > 2 livelli (heuristic).",
      });
    }
  }

  if (/header/i.test(fileRel)) {
    const compressedHeader = /h-(?:8|9|10)\b/.test(content) && /gap-(?:0|0\.5|1)\b/.test(content);
    if (compressedHeader) {
      findings.push({
        severity: "warning",
        file: fileRel,
        line: findLine(content, /h-(?:8|9|10)\b/),
        rule: "header-density",
        message: "Header density potenzialmente troppo compressa su mobile (heuristic).",
      });
    }
  }

  if (/button|icon-action|design-system|app-shell|toolbar/i.test(fileRel)) {
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i] ?? "";
      if (!/(?:className|const|export const)/.test(line)) continue;
      const sizes = parseTailwindSizeUnits(line);
      if (sizes.length === 0) continue;
      const minSize = Math.min(...sizes);
      if (minSize > 0 && minSize < 11) {
        findings.push({
          severity: "warning",
          file: fileRel,
          line: i + 1,
          rule: "touch-target",
          message: "Touch target potenzialmente < 44px (heuristic).",
        });
        break;
      }
    }
  }

  return findings;
}

function computeMobileUxScore(blockers: Finding[], warnings: Finding[]): number {
  const score = 100 - blockers.length * 18 - warnings.length * 4;
  return Math.max(0, Math.min(100, score));
}

function riskLevel(score: number): string {
  if (score >= 85) return "🟢 SAFE";
  if (score >= 60) return "🟡 RISK";
  return "🔴 BROKEN";
}

function runMobileHeuristicContext(): Finding[] {
  const findings: Finding[] = [];
  const tooltipFile = path.join(ROOT, "components", "design-system", "use-tooltip.ts");
  if (fs.existsSync(tooltipFile)) {
    const c = fs.readFileSync(tooltipFile, "utf8");
    if (!c.includes("(hover: none)") || !c.includes("pointer: coarse")) {
      findings.push({
        severity: "blocker",
        file: rel(tooltipFile),
        line: findLine(c, /onMouseEnter|Tooltip|pointer/),
        rule: "mobile-pointer-sim",
        message: "Simulazione mobile (hover:none/pointer:coarse) non coperta dal tooltip core.",
      });
    }
  }
  return findings;
}

function main() {
  const files = SRC_DIRS.flatMap((d) => walk(path.join(ROOT, d)));
  const findings: Finding[] = [...runMobileHeuristicContext()];
  for (const file of files) findings.push(...scanFile(file));

  const blockerFindings = findings.filter((f) => f.severity === "blocker");
  const warningFindings = findings.filter((f) => f.severity === "warning");
  const score = computeMobileUxScore(blockerFindings, warningFindings);
  const status = blockerFindings.length === 0 ? "PASS" : "FAIL";

  const blockers = blockerFindings.map(
    (f) => `${f.file}:${f.line} [${f.rule}] ${f.message}`,
  );
  const warnings = warningFindings.map(
    (f) => `${f.file}:${f.line} [${f.rule}] ${f.message}`,
  );

  printGateResult({ name: GATE_NAME, status, blockers, warnings });
  console.log(`MOBILE UX SCORE: ${score}`);
  console.log(`RISK LEVEL: ${riskLevel(score)}`);

  exitWithGate(status);
}

main();
