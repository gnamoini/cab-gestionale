import type { InterventoIdent } from "@/lib/domain/intervento-context/intervento-context.types";

function normIdent(v: string): string {
  return v.trim().toLowerCase();
}

function normScuderia(v: string): string {
  const n = normIdent(v);
  if (!n || n === "—") return "";
  return n;
}

export function normalizeInterventoIdentField(key: keyof InterventoIdent, value: string | null | undefined): string {
  const t = value?.trim() ?? "";
  if (key === "matricola" && t.toLowerCase() === "non assegnata") return "";
  if (t === "—") return "";
  return t;
}

export function normalizeInterventoIdent(ident: InterventoIdent): InterventoIdent {
  return {
    targa: normalizeInterventoIdentField("targa", ident.targa),
    matricola: normalizeInterventoIdentField("matricola", ident.matricola),
    nScuderia: normalizeInterventoIdentField("nScuderia", ident.nScuderia),
  };
}

export function interventoIdentEquals(a: InterventoIdent, b: InterventoIdent): boolean {
  const na = normalizeInterventoIdent(a);
  const nb = normalizeInterventoIdent(b);
  return (
    normIdent(na.targa) === normIdent(nb.targa) &&
    normIdent(na.matricola) === normIdent(nb.matricola) &&
    normScuderia(na.nScuderia) === normScuderia(nb.nScuderia)
  );
}

export function hasInterventoIdentValue(ident: InterventoIdent): boolean {
  const n = normalizeInterventoIdent(ident);
  if (n.nScuderia) return true;
  if (n.targa) return true;
  if (n.matricola) return true;
  return false;
}

/** Priorità: scheda > lavorazione > mezzo (valore non vuoto). */
export function resolveIdentFromLayers(
  scheda: Partial<InterventoIdent> | null | undefined,
  lavorazione: Partial<InterventoIdent> | null | undefined,
  mezzo: Partial<InterventoIdent> | null | undefined,
): InterventoIdent {
  const pick = (key: keyof InterventoIdent): string => {
    const s = scheda?.[key]?.trim() ?? "";
    if (s && s !== "—" && !(key === "matricola" && s.toLowerCase() === "non assegnata")) return s;
    const l = lavorazione?.[key]?.trim() ?? "";
    if (l && l !== "—" && !(key === "matricola" && l.toLowerCase() === "non assegnata")) return l;
    const m = mezzo?.[key]?.trim() ?? "";
    if (m && m !== "—" && !(key === "matricola" && m.toLowerCase() === "non assegnata")) return m;
    return "";
  };
  return normalizeInterventoIdent({
    targa: pick("targa"),
    matricola: pick("matricola"),
    nScuderia: pick("nScuderia"),
  });
}
