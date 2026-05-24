import { consolidateLogModificaRows } from "@/lib/gestionale-log/log-consolidate";
import { buildLogModificaSummary } from "@/lib/gestionale-log/log-summary";
import { isLogReverted } from "@/lib/gestionale-log/undo";
import type { GestionaleLogEventTone } from "@/lib/gestionale-log/view-model";
import { labelLavorazioneStatoDb } from "@/lib/mezzi/interventi-from-lavorazioni-db";
import { statoLavorazioneLabel } from "@/src/shared/selectors";
import type {
  DocumentoRow,
  LogModificaRow,
  LavorazioneRow,
  MovimentoRicambioRow,
  PreventivoRow,
  SchedaLavorazioneRow,
} from "@/src/types/supabase-tables";

export type LavorazioneAttivitaTier = "stato" | "primary" | "secondary";

export type LavorazioneAttivitaFilter = "all" | "stati" | "important";

export type LavorazioneAttivitaEvent = {
  id: string;
  at: string;
  tier: LavorazioneAttivitaTier;
  title: string;
  description: string;
  details?: string;
  autore: string;
  tone: GestionaleLogEventTone;
  /** Valore stato (dopo cambio) per badge su eventi workflow. */
  statoId?: string;
};

export type LavorazioneAttivitaFeedInput = {
  logRows: readonly LogModificaRow[];
  schedeRows: readonly SchedaLavorazioneRow[];
  movimentiRows: readonly MovimentoRicambioRow[];
  preventiviRows: readonly PreventivoRow[];
  documentiRows: readonly DocumentoRow[];
  lavorazione: LavorazioneRow;
  resolveAutore: (row: LogModificaRow) => string;
  statiOpts?: { id: string; label: string }[];
};

const SCHEDA_TIPO_LABEL: Record<string, string> = {
  ingresso: "Scheda ingresso",
  lavorazioni: "Scheda lavorazioni",
  ricambi: "Scheda ricambi",
};

function sortDesc(items: LavorazioneAttivitaEvent[]): LavorazioneAttivitaEvent[] {
  return [...items].sort((a, b) => {
    const tb = new Date(b.at).getTime();
    const ta = new Date(a.at).getTime();
    if (tb !== ta) return tb - ta;
    return b.id.localeCompare(a.id);
  });
}

function classifyTier(summary: ReturnType<typeof buildLogModificaSummary>, row: LogModificaRow): LavorazioneAttivitaTier {
  const tone = summary.tone;
  if (tone === "complete" || tone === "archive" || tone === "reopen") return "stato";

  const tipo = summary.tipoRiga.toUpperCase();
  const mods = summary.modifiche.join(" ").toLowerCase();

  if (tipo.includes("STATO") || mods.includes("stato modificato") || mods.includes("stato iniziale")) return "stato";
  if (tipo.includes("ARCHIV") || tipo.includes("COMPLET") || tipo.includes("RIPRISTIN")) return "stato";

  if (tipo.includes("ANNULLAMENTO") || row.azione === "REVERTED") return "secondary";
  if (mods.includes("aggiornato") && summary.modifiche.length === 1 && mods.includes("metadata")) return "secondary";

  const primaryHints = [
    "addetto",
    "priorità",
    "scheda",
    "file",
    "foto",
    "immagine",
    "ricamb",
    "moviment",
    "preventiv",
    "mezzo",
    "cliente",
    "ingresso",
    "creata nuova",
    "creazione",
  ];
  if (primaryHints.some((h) => mods.includes(h) || tipo.includes(h.toUpperCase()))) return "primary";

  if (summary.modifiche.length <= 1 && mods.includes("note")) return "secondary";

  return "primary";
}

function displayTitle(summary: ReturnType<typeof buildLogModificaSummary>, row: LogModificaRow): string {
  const mods = summary.modifiche;
  const first = mods[0] ?? "";
  if (first.includes("Stato modificato")) return "STATO AGGIORNATO";
  if (first.includes("Priorità modificata")) return "PRIORITÀ AGGIORNATA";
  if (first.toLowerCase().includes("addetto")) return "AGGIORNAMENTO ADDETTO";
  if (summary.tone === "complete") return "LAVORAZIONE COMPLETATA";
  if (summary.tone === "archive") return "LAVORAZIONE ARCHIVIATA";
  if (summary.tone === "reopen") return "LAVORAZIONE RIAPERTA";
  if (row.azione === "RESTORE") return "LAVORAZIONE RIPRISTINATA";
  if (row.azione === "CREATE" && row.entita === "lavorazioni") return "LAVORAZIONE CREATA";

  const t = summary.tipoRiga;
  if (t.startsWith("AGGIORNAMENTO ")) return t.replace(/^AGGIORNAMENTO /, "MODIFICA ");
  if (t.startsWith("CREAZIONE ")) return t.replace(/^CREAZIONE /, "NUOVO ");
  return t;
}

function parseStatoAfterFromModifiche(modifiche: string[], statiOpts: { id: string; label: string }[]): string | undefined {
  for (const line of modifiche) {
    const m = line.match(/Stato modificato da .+ a [“"]([^"”]+)[”"]/i);
    if (!m?.[1]) continue;
    const label = m[1].trim();
    const hit = statiOpts.find((s) => s.label === label || s.id === label);
    return hit?.id ?? label;
  }
  return undefined;
}

function eventFromLog(
  row: LogModificaRow,
  resolveAutore: (row: LogModificaRow) => string,
  statiOpts: { id: string; label: string }[],
): LavorazioneAttivitaEvent {
  const reverted = isLogReverted(row);
  const summary = buildLogModificaSummary({
    entita: row.entita,
    entita_id: row.entita_id,
    azione: reverted ? "UNDO" : row.azione,
    payload: row.payload,
    annullato: reverted,
    statiLavorazione: statiOpts,
  });

  const tier = classifyTier(summary, row);
  const description = summary.modifiche.length
    ? summary.modifiche.map((m) => m.replace(/^•\s*/, "")).join("\n")
    : "—";

  return {
    id: `log-${row.id}`,
    at: row.created_at,
    tier,
    title: displayTitle(summary, row),
    description,
    details: summary.oggettoRiga !== "—" && summary.oggettoRiga !== "Lavorazione" ? summary.oggettoRiga : undefined,
    autore: resolveAutore(row),
    tone: summary.tone,
    statoId: tier === "stato" ? parseStatoAfterFromModifiche(summary.modifiche, statiOpts) : undefined,
  };
}

function supplementFromDomain(input: LavorazioneAttivitaFeedInput): LavorazioneAttivitaEvent[] {
  const items: LavorazioneAttivitaEvent[] = [];
  const lavId = input.lavorazione.id;

  for (const s of input.schedeRows) {
    if (s.lavorazione_id !== lavId) continue;
    const label = SCHEDA_TIPO_LABEL[s.tipo] ?? `Scheda ${s.tipo}`;
    items.push({
      id: `scheda-${s.id}-${s.updated_at}`,
      at: s.updated_at,
      tier: "primary",
      title: `AGGIORNAMENTO ${label.toUpperCase()}`,
      description: s.created_at === s.updated_at ? "Scheda creata" : "Scheda aggiornata",
      autore: "Sistema",
      tone: "update",
    });
  }

  for (const m of input.movimentiRows) {
    if (m.lavorazione_id !== lavId) continue;
    const isUscita = m.tipo === "uscita";
    items.push({
      id: `mov-${m.id}`,
      at: m.created_at,
      tier: "primary",
      title: isUscita ? "SCARICO RICAMBI" : "CARICO RICAMBI",
      description: `${isUscita ? "Uscita" : "Entrata"} magazzino · quantità ${m.quantita}`,
      autore: "Sistema",
      tone: isUscita ? "update" : "create",
    });
  }

  for (const p of input.preventiviRows) {
    if (p.lavorazione_id !== lavId) continue;
    const det = p.dettagli && typeof p.dettagli === "object" ? (p.dettagli as Record<string, unknown>) : {};
    const numero = typeof det.numero === "string" ? det.numero : p.id.slice(0, 8);
    items.push({
      id: `pv-${p.id}`,
      at: p.created_at,
      tier: "primary",
      title: "PREVENTIVO COLLEGATO",
      description: `Preventivo ${numero} · ${p.cliente || "—"}`,
      autore: "Sistema",
      tone: "create",
    });
  }

  for (const d of input.documentiRows) {
    const meta = d.meta && typeof d.meta === "object" ? (d.meta as Record<string, unknown>) : {};
    const nome = typeof meta.nome === "string" ? meta.nome : "Documento";
    items.push({
      id: `doc-${d.id}`,
      at: d.created_at,
      tier: "secondary",
      title: "DOCUMENTO",
      description: nome,
      autore: "Sistema",
      tone: "create",
    });
  }

  return items;
}

/** Evita doppioni log + supplementi (stesso tipo entro 90s). */
function dedupeEvents(items: LavorazioneAttivitaEvent[]): LavorazioneAttivitaEvent[] {
  const seenLog = new Set<string>();
  const out: LavorazioneAttivitaEvent[] = [];

  for (const ev of sortDesc(items)) {
    if (ev.id.startsWith("log-")) {
      if (seenLog.has(ev.id)) continue;
      seenLog.add(ev.id);
      out.push(ev);
      continue;
    }
    const nearDup = out.some(
      (o) =>
        o.title === ev.title &&
        Math.abs(new Date(o.at).getTime() - new Date(ev.at).getTime()) < 90_000,
    );
    if (!nearDup) out.push(ev);
  }

  return sortDesc(out);
}

export function buildLavorazioneAttivitaFeed(input: LavorazioneAttivitaFeedInput): LavorazioneAttivitaEvent[] {
  const statiOpts = input.statiOpts ?? [];
  const fromLogs = consolidateLogModificaRows(input.logRows).map((row) =>
    eventFromLog(row, input.resolveAutore, statiOpts),
  );
  const merged = dedupeEvents([...fromLogs, ...supplementFromDomain(input)]);
  return merged;
}

export function filterLavorazioneAttivita(
  events: readonly LavorazioneAttivitaEvent[],
  filter: LavorazioneAttivitaFilter,
): LavorazioneAttivitaEvent[] {
  if (filter === "stati") return events.filter((e) => e.tier === "stato");
  if (filter === "important") return events.filter((e) => e.tier !== "secondary");
  return [...events];
}

export function fmtLavorazioneAttivitaWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function statoLabelForAttivita(statoId: string | undefined, statiOpts: { id: string; label: string }[]): string {
  if (!statoId) return "";
  const byId = statiOpts.find((s) => s.id === statoId);
  if (byId) return byId.label;
  return labelLavorazioneStatoDb(statoId as LavorazioneRow["stato"]) || statoLavorazioneLabel(statoId, statiOpts);
}
