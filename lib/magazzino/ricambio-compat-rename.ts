import {
  compatLabelMarcaModello,
  parseCompatMarcaModello,
} from "@/lib/mezzi/attrezzature-prefs";
import type { HierarchyTreeKey } from "@/lib/mezzi/hierarchy-list-prefs";
import type { SettingsRenameKind } from "@/lib/settings/settings-rename-types";

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export type PatchCompatRenameOpts = {
  kind: SettingsRenameKind;
  from: string;
  to: string;
  /** Contesto marca obbligatorio per rename modello. */
  marcaContext?: string;
  tree?: HierarchyTreeKey;
};

function isHierarchyMarcaKind(kind: SettingsRenameKind): boolean {
  return kind === "hierarchy_marca_attrezzature" || kind === "hierarchy_marca_telai";
}

function isHierarchyModelloKind(kind: SettingsRenameKind): boolean {
  return kind === "hierarchy_modello_attrezzature" || kind === "hierarchy_modello_telai";
}

/** Patch singola riga compat legacy «Marca — Modello». */
export function patchCompatLineRename(line: string, opts: PatchCompatRenameOpts): string {
  const { kind, from, to } = opts;
  const trimmed = line.trim();
  if (!trimmed) return line;

  const { marca, modello } = parseCompatMarcaModello(trimmed);

  if (isHierarchyMarcaKind(kind)) {
    if (norm(marca) !== norm(from)) return line;
    return compatLabelMarcaModello(to, modello);
  }

  if (isHierarchyModelloKind(kind)) {
    const ctx = opts.marcaContext?.trim();
    if (ctx && norm(marca) !== norm(ctx)) return line;
    if (!modello || norm(modello) !== norm(from)) return line;
    return compatLabelMarcaModello(marca || ctx || "", to);
  }

  return line;
}

/** Patch array compatibilitaMezzi in meta. I refs con ID stabili non richiedono patch. */
export function patchCompatMezziArray(
  arr: unknown,
  opts: PatchCompatRenameOpts,
): { next: string[]; changed: boolean } {
  if (!Array.isArray(arr)) return { next: [], changed: false };
  let changed = false;
  const nextArr = arr.map((v) => {
    if (typeof v !== "string") return v;
    const patched = patchCompatLineRename(v, opts);
    if (patched !== v) changed = true;
    return patched;
  }) as string[];
  return { next: nextArr, changed };
}
