"use client";

import type { LogModificaRow } from "@/src/types/supabase-tables";
import {
  buildModificaRigaFromChanges,
  formatTitleCasePhrase,
  imageLogModificaRiga,
  imageLogTipoRiga,
  isImageLogAction,
  type GestionaleLogEventTone,
  type GestionaleLogViewModel,
} from "@/lib/gestionale-log/view-model";
import { auditPayload, isLogReverted } from "@/lib/gestionale-log/undo";
import { Q_FOCUS_LAV_ROW, Q_FOCUS_RICAMBIO } from "@/lib/navigation/dashboard-log-links";

export function logAutoreLabel(r: LogModificaRow, currentUserId: string | null, displayName: string): string {
  if (r.autore_id && currentUserId && r.autore_id === currentUserId) return displayName.trim() || "Tu";
  if (r.autore_id) return `Utente ${r.autore_id.slice(0, 8)}…`;
  return "Sistema";
}

function toneFromLogAzione(azione: string): GestionaleLogEventTone {
  if (azione === "image_uploaded") return "create";
  if (azione === "image_deleted") return "delete";
  const u = (azione ?? "").toUpperCase();
  if (u === "CREATE" || u === "RESTORE") return "create";
  if (u === "DELETE") return "delete";
  return "update";
}

function shortRef(id: string): string {
  const t = id.trim();
  if (t.length <= 10) return t.toUpperCase();
  return `#${t.slice(0, 8).toUpperCase()}`;
}

function recordLabelFromPayload(row: LogModificaRow): string {
  const p = auditPayload(row);
  const raw = (p.after ?? p.before ?? (row.payload as { snapshot?: unknown } | null)?.snapshot) as Record<string, unknown> | null | undefined;
  if (!raw || typeof raw !== "object") return shortRef(row.entita_id);
  if (typeof raw.codice === "string" && raw.codice.trim()) return raw.codice.trim();
  if (typeof raw.descrizione === "string" && raw.descrizione.trim()) return raw.descrizione.trim();
  if (typeof raw.marca === "string") {
    const m = `${raw.marca} ${typeof raw.modello === "string" ? raw.modello : ""}`.trim();
    if (m) return m;
  }
  if (typeof raw.matricola === "string" && raw.matricola.trim()) return raw.matricola.trim();
  if (typeof raw.targa === "string" && raw.targa.trim()) return raw.targa.trim();
  return shortRef(row.entita_id);
}

function entitaOggettoRiga(row: LogModificaRow): string {
  const label = recordLabelFromPayload(row);
  switch (row.entita) {
    case "lavorazioni":
      return `Lavorazione · ${label}`;
    case "magazzino_ricambi":
      return `Ricambio · ${formatTitleCasePhrase(label)}`;
    case "mezzi":
      return `Mezzo · ${formatTitleCasePhrase(label)}`;
    case "preventivi":
      return `Preventivo · ${shortRef(row.entita_id)}`;
    case "documenti":
      return `Documento · ${shortRef(row.entita_id)}`;
    case "movimenti_ricambi":
      return `Movimento magazzino · ${shortRef(row.entita_id)}`;
    default:
      return `${row.entita} · ${label}`;
  }
}

function diffChangesFromAudit(row: LogModificaRow): { campo: string; prima: string; dopo: string }[] {
  const p = auditPayload(row);
  const before = p.before && typeof p.before === "object" ? (p.before as Record<string, unknown>) : null;
  const after = p.after && typeof p.after === "object" ? (p.after as Record<string, unknown>) : null;
  if (!before || !after) return [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const out: { campo: string; prima: string; dopo: string }[] = [];
  for (const k of keys) {
    const a = before[k];
    const b = after[k];
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    if (k === "updated_at" || k === "created_at") continue;
    out.push({
      campo: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      prima: a == null ? "—" : String(a),
      dopo: b == null ? "—" : String(b),
    });
    if (out.length >= 8) break;
  }
  return out;
}

function modificaRigaFromRow(row: LogModificaRow): string {
  if (isImageLogAction(row.azione)) return imageLogModificaRiga(row.azione);
  const p = row.payload as { compact?: string; event?: string } | null | undefined;
  if (typeof p?.compact === "string" && p.compact.trim()) return p.compact.trim();
  if (typeof p?.event === "string" && p.event.trim()) return p.event.trim();
  const changes = diffChangesFromAudit(row);
  if (changes.length) return buildModificaRigaFromChanges(changes);
  if (row.azione === "CREATE") return "Record creato";
  if (row.azione === "DELETE") return "Record eliminato";
  if (row.azione === "RESTORE") return "Record ripristinato";
  return "Modifica registrata";
}

/** Vista centralizzata di una riga `log_modifiche` per UI gestionale. */
export function buildLogModificheGestionaleViewModel(row: LogModificaRow, autore: string): GestionaleLogViewModel {
  const reverted = isLogReverted(row);
  return {
    tone: reverted ? "neutral" : toneFromLogAzione(row.azione),
    tipoRiga: reverted ? "ANNULLATA" : (row.azione ?? "UPDATE").toUpperCase(),
    oggettoRiga: entitaOggettoRiga(row),
    modificaRiga: modificaRigaFromRow(row),
    autore,
    atIso: row.created_at,
    annullato: reverted,
  };
}

/** Deep link da voce log globale a pagina operativa. */
export function buildLogModificheFocusHref(row: LogModificaRow): string | null {
  if (row.entita === "lavorazioni") {
    const sp = new URLSearchParams();
    sp.set(Q_FOCUS_LAV_ROW, row.entita_id);
    return `/lavorazioni?${sp.toString()}`;
  }
  if (row.entita === "magazzino_ricambi") {
    const sp = new URLSearchParams();
    sp.set(Q_FOCUS_RICAMBIO, row.entita_id);
    return `/magazzino?${sp.toString()}`;
  }
  if (row.entita === "mezzi") return `/mezzi`;
  if (row.entita === "preventivi") return `/preventivi`;
  if (row.entita === "documenti") return `/documenti`;
  return null;
}
