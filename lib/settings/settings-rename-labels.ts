import type { AttrezzaturaMarca } from "@/lib/mezzi/attrezzature-prefs";

/** Etichette piatte da gerarchia marche/modelli (impostazioni rename validation). */
export function flattenHierarchyRenameLabels(marche?: readonly AttrezzaturaMarca[]): string[] {
  if (!marche?.length) return [];
  const out: string[] = [];
  for (const marca of marche) {
    const nome = marca.nome?.trim();
    if (nome) out.push(nome);
    for (const modello of marca.modelli ?? []) {
      const mn = modello.nome?.trim();
      if (mn) out.push(mn);
    }
  }
  return out;
}
