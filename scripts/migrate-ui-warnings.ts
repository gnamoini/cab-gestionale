/**
 * One-shot: fix audit WARN — direct Tooltip imports + inline LIST_DIVIDER_UL.
 * ponytail: idempotent string replace, safe to re-run.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

const TOOLTIP_FILES = [
  "components/dashboard/settings-dipendenti-assenze-section.tsx",
  "components/gestionale/dipendenti/dipendenti-timesheet-compact-cell.tsx",
  "components/gestionale/dipendenti/dipendenti-timesheet-grid.tsx",
  "components/gestionale/gestionale-log-ui.tsx",
  "components/gestionale/magazzino/magazzino-import-entry.tsx",
  "components/gestionale/magazzino/magazzino-listino-ai-badge.tsx",
  "components/gestionale/magazzino/ricambio-info-panel.tsx",
  "components/gestionale/media/record-image-manager.tsx",
  "components/gestionale/mezzi/mezzi-table.tsx",
  "components/gestionale/schede/scheda-ingresso-anagrafica-fields.tsx",
  "components/gestionale/sidebar-nav-row.tsx",
  "components/gestionale/theme-toggle.tsx",
  "components/lavorazioni-clienti/client-portal-stato-progress.tsx",
  "components/workshop-schedule/agenda-auto-scheduler-panel.tsx",
  "components/workshop-schedule/agenda-capacity-card.tsx",
  "components/workshop-schedule/agenda-day-timeline.tsx",
  "components/workshop-schedule/agenda-filters-bar.tsx",
  "components/workshop-schedule/agenda-heatmap-grid.tsx",
  "components/workshop-schedule/agenda-intelligence-sidebar.tsx",
  "components/workshop-schedule/agenda-officina-view.tsx",
  "components/workshop-schedule/agenda-session-block.tsx",
  "components/workshop-schedule/agenda-session-detail-panel.tsx",
  "components/workshop-schedule/agenda-view-tabs.tsx",
  "components/workshop-schedule/agenda-weekly-load-widget.tsx",
];

const LIST_FILES = [
  "components/dashboard/security/security-user-detail-drawer.tsx",
  "components/dashboard/settings/cliente-anagrafica-panoramica.tsx",
  "components/dashboard/settings-branding-section.tsx",
  "components/dashboard/settings-dipendenti-assenze-section.tsx",
  "components/document-capture/document-capture-history-panel.tsx",
  "components/fatturazione/fatturazione-detail-drawer.tsx",
  "components/fatturazione/sections/fatturazione-sdi-section.tsx",
  "components/gestionale/lavorazioni/lavorazioni-settings-ui.tsx",
  "components/gestionale/mezzi/mezzi-hub-ui.tsx",
  "components/lavorazioni/lavorazione-attivita-panel.tsx",
  "components/lavorazioni/schede/schede-lavorazione-modal.tsx",
  "components/profile/profile-actions-section.tsx",
];

const INLINE_DIVIDER = "divide-y divide-[color:var(--cab-border)]";
const LIST_IMPORT = `import { LIST_DIVIDER_UL } from "@/lib/ui/list-primitives";`;

function fixTooltipImport(src: string): string {
  let out = src;
  // Remove Tooltip from design-system barrel imports
  out = out.replace(
    /import\s*\{([^}]*)\}\s*from\s*"@\/components\/design-system";/g,
    (m, inner: string) => {
      const parts = inner
        .split(",")
        .map((p: string) => p.trim())
        .filter(Boolean);
      const tooltipIdx = parts.findIndex((p) => /^Tooltip\b/.test(p));
      if (tooltipIdx === -1) return m;
      parts.splice(tooltipIdx, 1);
      if (parts.length === 0) return "";
      return `import { ${parts.join(", ")} } from "@/components/design-system";`;
    },
  );
  out = out.replace(
    /import\s*\{\s*Tooltip\s*\}\s*from\s*"@\/components\/design-system\/tooltip";\n?/g,
    "",
  );
  out = out.replace(
    /import\s*\{\s*Tooltip\s*\}\s*from\s*"@\/components\/design-system";\n?/g,
    "",
  );
  if (/\bTooltip\b/.test(out) && !/from\s*"@\/components\/ui"/.test(out)) {
    const firstImport = out.match(/^import .+$/m);
    if (firstImport) {
      out = out.replace(firstImport[0], `${firstImport[0]}\nimport { Tooltip } from "@/components/ui";`);
    } else {
      out = `import { Tooltip } from "@/components/ui";\n` + out;
    }
  }
  return out.replace(/\n{3,}/g, "\n\n");
}

function fixListDivider(src: string): string {
  if (!src.includes(INLINE_DIVIDER)) return src;
  let out = src.replaceAll(INLINE_DIVIDER, "${LIST_DIVIDER_UL}");
  // Also handle template literals that already have other classes
  if (!out.includes(LIST_IMPORT) && !out.includes("LIST_DIVIDER_UL")) {
    const firstImport = out.match(/^import .+$/m);
    if (firstImport) {
      out = out.replace(firstImport[0], `${firstImport[0]}\n${LIST_IMPORT}`);
    } else {
      out = LIST_IMPORT + "\n" + out;
    }
  } else if (!out.includes(LIST_IMPORT) && out.includes("LIST_DIVIDER_UL")) {
    const firstImport = out.match(/^import .+$/m);
    if (firstImport) {
      out = out.replace(firstImport[0], `${firstImport[0]}\n${LIST_IMPORT}`);
    }
  }
  // Fix className strings: "foo bar ${LIST_DIVIDER_UL}" needs backticks
  out = out.replace(
    /className="([^"]*\$\{LIST_DIVIDER_UL\}[^"]*)"/g,
    "className={`$1`}",
  );
  return out;
}

let changed = 0;
for (const rel of [...new Set([...TOOLTIP_FILES, ...LIST_FILES])]) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    console.warn("skip missing", rel);
    continue;
  }
  const orig = fs.readFileSync(abs, "utf8");
  let next = orig;
  if (TOOLTIP_FILES.includes(rel)) next = fixTooltipImport(next);
  if (LIST_FILES.includes(rel)) next = fixListDivider(next);
  if (next !== orig) {
    fs.writeFileSync(abs, next);
    changed++;
    console.log("fixed", rel);
  }
}
console.log(`done: ${changed} files`);
