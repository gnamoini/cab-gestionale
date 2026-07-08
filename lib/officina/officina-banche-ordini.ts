/** Banche d'appoggio ordini fornitori — settings `system.banche_ordini_fornitori`. */

export const OFFICINA_BANCHE_ORDINI_MODULE = "system" as const;
export const OFFICINA_BANCHE_ORDINI_KEY = "banche_ordini_fornitori" as const;

export type OfficinaBancaOrdini = {
  id: string;
  nome: string;
  iban: string;
};

function strField(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function emptyOfficinaBancaOrdini(): OfficinaBancaOrdini {
  return { id: crypto.randomUUID(), nome: "", iban: "" };
}

export function parseOfficinaBancaOrdiniRow(raw: unknown): OfficinaBancaOrdini | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const nome = strField(o.nome).trim();
  const iban = strField(o.iban).trim();
  if (!nome && !iban) return null;
  const id = strField(o.id).trim() || crypto.randomUUID();
  return { id, nome, iban };
}

export function parseOfficinaBancheOrdiniSettings(value: unknown): OfficinaBancaOrdini[] {
  if (!Array.isArray(value)) return [];
  const out: OfficinaBancaOrdini[] = [];
  for (const row of value) {
    const parsed = parseOfficinaBancaOrdiniRow(row);
    if (parsed) out.push(parsed);
  }
  return out;
}

type AppSettingsRowLike = { module?: string | null; key?: string | null; value?: unknown };

export function readOfficinaBancheOrdiniFromRows(
  rows: AppSettingsRowLike[] | undefined,
): OfficinaBancaOrdini[] {
  if (!rows?.length) return [];
  const row = rows.find(
    (r) => r.module === OFFICINA_BANCHE_ORDINI_MODULE && r.key === OFFICINA_BANCHE_ORDINI_KEY,
  );
  return parseOfficinaBancheOrdiniSettings(row?.value);
}

export function resolveOfficinaBancaIban(
  banche: readonly OfficinaBancaOrdini[],
  nome: string,
): string {
  const t = nome.trim();
  if (!t) return "";
  const hit = banche.find((b) => b.nome.trim().toLowerCase() === t.toLowerCase());
  return hit?.iban.trim() ?? "";
}

export function officinaBancheOrdiniToPayload(banche: OfficinaBancaOrdini[]): Record<string, unknown>[] {
  return banche
    .map((b) => ({
      id: b.id,
      nome: b.nome.trim(),
      iban: b.iban.trim(),
    }))
    .filter((b) => b.nome || b.iban);
}
