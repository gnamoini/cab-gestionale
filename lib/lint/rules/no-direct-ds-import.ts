/**
 * Direct design-system tooltip import outside allowlist.
 */

import {
  TOOLTIP_CONTRACT,
  UI_DS_IMPORT_ALLOWLIST,
} from "@/lib/ui-design-system-lock/component-contracts";

export type DirectDsImportViolation = {
  file: string;
  line: number;
  specifier: string;
  message: string;
  fix: string;
};

const FORBIDDEN_SPECIFIERS = [
  "@/components/design-system/tooltip",
  "@/components/design-system",
];

function isAllowlisted(fileRel: string): boolean {
  const n = fileRel.replace(/\\/g, "/");
  return UI_DS_IMPORT_ALLOWLIST.some((p) => n.includes(p));
}

/** Regex fallback for audit (ESLint uses same logic) */
export function scanDirectDsTooltipImports(
  fileRel: string,
  content: string,
): DirectDsImportViolation[] {
  if (isAllowlisted(fileRel)) return [];
  const violations: DirectDsImportViolation[] = [];
  const lines = content.split(/\r?\n/);
  lines.forEach((line, idx) => {
    if (!/\bTooltip\b/.test(line)) return;
    for (const spec of FORBIDDEN_SPECIFIERS) {
      if (!line.includes(`"${spec}"`) && !line.includes(`'${spec}'`)) continue;
      if (spec === "@/components/design-system" && !/\bTooltip\b/.test(line)) continue;
      violations.push({
        file: fileRel,
        line: idx + 1,
        specifier: spec,
        message: `Direct import from ${spec}`,
        fix: `import { Tooltip } from "${TOOLTIP_CONTRACT.consumerImportPath}"`,
      });
    }
  });
  return violations;
}

export function isDsImportAllowlisted(fileRel: string): boolean {
  return isAllowlisted(fileRel);
}
