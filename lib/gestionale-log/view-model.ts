import type { LavorazioniLogEntry, LavorazioniLogTipo } from "@/lib/lavorazioni/lavorazioni-change-log";
import { filterAuditMetadataCampoChanges } from "@/lib/gestionale-log/log-summary";

function toBulletModificaRiga(lines: string[]): string {
  if (!lines.length) return "—";
  return lines.map((l) => `• ${l.replace(/^•\s*/, "").trim()}`).join("\n");
}

export function parseModificheLines(modificaRiga: string): string[] {
  const raw = safeStr(modificaRiga).trim();
  if (!raw || raw === "—") return [];
  return raw
    .split(/\n+/)
    .map((line) => line.replace(/^•\s*/, "").trim())
    .filter(Boolean);
}

export type GestionaleLogEventTone =
  | "create"
  | "update"
  | "delete"
  | "complete"
  | "archive"
  | "reopen"
  | "neutral";

export type GestionaleLogViewModel = {
  tone: GestionaleLogEventTone;
  /** Riga 1 — tipo modifica (MAIUSCOLO) */
  tipoRiga: string;
  /** Riga 2 — oggetto (es. Ricambio: … / Lavorazione: …) */
  oggettoRiga: string;
  /** Riga 3 — descrizione modifica (può contenere newline) */
  modificaRiga: string;
  autore: string;
  atIso: string;
  /** Voce magazzino annullata (undo scorta): solo presentazione UI. */
  annullato?: boolean;
};

export type CampoChangeLike = { campo: string; prima: string; dopo: string };

export type MagazzinoLogEntryLike = {
  tipo: "aggiunta" | "update" | "rimozione";
  ricambio: string;
  riepilogo: string;
  autore: string;
  at: string;
  changes: CampoChangeLike[];
  /** Se true: modifica annullata in UI (es. undo scorta); la voce resta nello storico. */
  annullato?: boolean;
};

export function gestionaleLogToneMagazzino(tipo: MagazzinoLogEntryLike["tipo"]): GestionaleLogEventTone {
  if (tipo === "aggiunta") return "create";
  if (tipo === "rimozione") return "delete";
  return "update";
}

export function gestionaleLogToneLavorazioni(tipo: LavorazioniLogTipo): GestionaleLogEventTone {
  switch (tipo) {
    case "creazione":
      return "create";
    case "eliminazione":
      return "delete";
    case "completata":
      return "complete";
    case "archiviazione":
      return "archive";
    case "riaperta":
      return "reopen";
    case "aggiornamento":
    default:
      return "update";
  }
}

export function formatGestionaleLogDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return safeStr(iso);
    return d.toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return safeStr(iso);
  }
}

/** Autore in riga meta (casing naturale, non tutto maiuscolo). */
export function formatLogAuthorDisplay(name: string): string {
  const t = safeStr(name).trim();
  return t || "Sistema";
}

/** Etichetta breve per feed attività (senza dettaglio campi — il link porta all'oggetto). */
export function activityFeedEventLabel(vm: GestionaleLogViewModel): string {
  const tipo = safeStr(vm.tipoRiga).trim().toUpperCase();
  if (vm.annullato || tipo.includes("ANNULLAT")) return "Operazione annullata";
  if (tipo.includes("CARICAMENTO FILE")) return "File caricato";
  if (tipo.includes("ELIMINAZIONE FILE")) return "File eliminato";

  if (tipo.includes("MOVIMENTO")) {
    if (tipo.includes("ENTRAT") || tipo.includes("INGRESS")) return "Ingresso magazzino";
    if (tipo.includes("USCIT") || tipo.includes("SCARIC")) return "Uscita magazzino";
    return "Movimento magazzino";
  }

  switch (vm.tone) {
    case "create":
      if (tipo.includes("RICAMBIO")) return "Ricambio inserito";
      if (tipo.includes("LAVORAZIONE") || tipo.includes("SCHEDA")) return "Ingresso";
      if (tipo.includes("PREVENTIVO")) return "Preventivo creato";
      if (tipo.includes("FATTUR") || tipo.includes("INVOICE")) return "Fattura emessa";
      if (tipo.includes("DDT")) return "DDT creato";
      if (tipo.includes("PAGAMENT")) return "Incasso registrato";
      return "Nuovo elemento";
    case "delete":
      if (tipo.includes("RICAMBIO")) return "Ricambio eliminato";
      if (tipo.includes("PREVENTIVO")) return "Preventivo eliminato";
      if (tipo.includes("FATTUR") || tipo.includes("INVOICE")) return "Fattura eliminata";
      if (tipo.includes("DDT")) return "DDT eliminato";
      return "Elemento eliminato";
    case "complete":
      return "Completata";
    case "archive":
      return "Archiviata";
    case "reopen":
      return "Riaperta";
    case "update":
    default:
      if (tipo.includes("RICAMBIO")) return "Ricambio aggiornato";
      if (tipo.includes("LAVORAZIONE") || tipo.includes("SCHEDA")) return "Lavorazione aggiornata";
      if (tipo.includes("PREVENTIVO")) return "Preventivo aggiornato";
      if (tipo.includes("FATTUR") || tipo.includes("INVOICE") || tipo.includes("PAGAMENT")) return "Fattura aggiornata";
      if (tipo.includes("DDT")) return "DDT aggiornato";
      if (tipo.includes("ORDINE")) return "Ordine aggiornato";
      return "Aggiornamento";
  }
}

function movimentoTipoFromLogRow(row: { entita: string; payload?: unknown }): "entrata" | "uscita" | null {
  if (row.entita !== "movimenti_ricambi") return null;
  const payload = row.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  for (const rec of [record.after, record.snapshot, record.before]) {
    if (!rec || typeof rec !== "object" || Array.isArray(rec)) continue;
    const tipo = safeStr((rec as Record<string, unknown>).tipo).toLowerCase();
    if (tipo === "entrata") return "entrata";
    if (tipo === "uscita") return "uscita";
  }
  return null;
}

/** Etichetta feed da gruppo log aggregati — privilegia l'esito semantico (completata, ingresso, …). */
export function activityFeedEventLabelFromGroup(
  vm: GestionaleLogViewModel,
  sourceRows?: readonly { entita: string; azione: string; payload?: unknown }[],
): string {
  if (!sourceRows?.length) return activityFeedEventLabel(vm);

  for (const row of [...sourceRows].reverse()) {
    const az = safeStr(row.azione).trim().toUpperCase();
    if (az.includes("COMPLET") || az === "CONCLUDE") {
      if (row.entita === "lavorazioni" || row.entita === "scheda_lavorazione") return "Completata";
    }
    if (az.includes("ARCHIV")) {
      if (row.entita === "lavorazioni") return "Archiviata";
    }
    if (az === "CREATE" && row.entita === "lavorazioni") return "Ingresso";
    if (az === "CREATE" && row.entita === "scheda_lavorazione") return "Ingresso";
    const movTipo = movimentoTipoFromLogRow(row);
    if (movTipo === "entrata") return "Ingresso magazzino";
    if (movTipo === "uscita") return "Uscita magazzino";
  }

  const mod = safeStr(vm.modificaRiga).toLowerCase();
  if (/\bcompletat/.test(mod) || /\barchiviata?\b/.test(mod)) return "Completata";
  if (mod.includes("data ingresso") || (mod.includes("ingresso") && mod.includes("scheda"))) return "Ingresso";

  return activityFeedEventLabel(vm);
}

export function formatActivityFeedWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function activityFeedMetaLine(vm: GestionaleLogViewModel, eventCount: number): string {
  const who = formatLogAuthorDisplay(vm.autore);
  const when = formatActivityFeedWhen(vm.atIso);
  if (eventCount > 1) return `${who} · ${eventCount} eventi · ${when}`;
  return `${who} · ${when}`;
}

export function formatGestionaleLogMetaLine(autore: string, iso: string): string {
  return `${formatLogAuthorDisplay(autore)} • ${formatGestionaleLogDateTime(iso)}`;
}

/** Riga unica compatta per liste log (tipo, oggetto, dettaglio, autore, data). */
export function formatGestionaleLogCompactLine(vm: GestionaleLogViewModel): string {
  const tipo = safeStr(vm.tipoRiga).trim().toUpperCase() || "MODIFICA";
  const oggetto = safeStr(vm.oggettoRiga).trim() || "—";
  const modifica = safeStr(vm.modificaRiga).replace(/\s+/g, " ").trim() || "—";
  const autore = formatLogAuthor(vm.autore);
  const data = formatGestionaleLogDateTime(vm.atIso);
  return `(${tipo}, ${oggetto}, ${modifica}, ${autore}, ${data})`;
}

export function safeStr(s: unknown): string {
  if (s === null || s === undefined) return "";
  return String(s);
}

export function isImageLogAction(action: string): action is "image_uploaded" | "image_deleted" {
  return action === "image_uploaded" || action === "image_deleted";
}

export function imageLogTipoRiga(action: string): string {
  return action === "image_deleted" ? "ELIMINAZIONE FILE" : "CARICAMENTO FILE";
}

export function imageLogModificaRiga(action: string): string {
  return action === "image_deleted" ? "Foto eliminata" : "Foto caricata";
}

/** Nome utente per riga 4: maiuscolo, mai vuoto. */
export function formatLogAuthor(name: string): string {
  const t = safeStr(name).trim();
  return t ? t.toUpperCase() : "SISTEMA";
}

/** Title case per parole (marche, nomi, stati generici). */
export function formatTitleCasePhrase(raw: string): string {
  const s = safeStr(raw).trim();
  if (!s || s === "—") return "—";
  return s
    .split(/\s+/)
    .map((w) => {
      if (!w) return w;
      const sub = w.split(/([\-/])/);
      return sub
        .map((part) => {
          if (part === "-" || part === "/") return part;
          if (!part) return part;
          if (/^[A-Z0-9]{2,}$/.test(part)) return part;
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        })
        .join("");
    })
    .join(" ");
}

/** Stati lavorazioni / etichette in frase (es. "In Lavorazione"). */
export function formatStatoDisplay(raw: string): string {
  const s = safeStr(raw)
    .trim()
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'");
  if (!s || s === "—") return "—";
  const lower = s.toLowerCase();
  const map: Record<string, string> = {
    "in lavorazione": "In Lavorazione",
    "da lavorare": "Da Lavorare",
    "attesa ricambi": "Attesa Ricambi",
    "attesa preventivo": "Attesa Preventivo",
    "accettazione": "Accettazione",
    "completata": "Completata",
    "in manutenzione": "In Manutenzione",
    "in collaudo": "In Collaudo",
  };
  if (map[lower]) return map[lower]!;
  return formatTitleCasePhrase(s);
}

function formatTargaDisplay(raw: string): string {
  const t = safeStr(raw).trim();
  if (!t || t === "—") return "—";
  return t.toUpperCase();
}

function sentenceForCampoChange(c: CampoChangeLike): string {
  const campo = safeStr(c.campo).trim();
  const p = safeStr(c.prima).trim() || "—";
  const d = safeStr(c.dopo).trim() || "—";

  if (campo === "Scorta") {
    const a = Number.parseInt(p, 10);
    const b = Number.parseInt(d, 10);
    if (!Number.isNaN(a) && !Number.isNaN(b)) {
      return `Scorta modificata da ${a} a ${b}`;
    }
    return `Scorta aggiornata da ${p} a ${d}`;
  }
  if (campo === "Stato") {
    return `Stato modificato da “${formatStatoDisplay(p)}” a “${formatStatoDisplay(d)}”`;
  }
  if (campo === "Priorità") {
    return `Priorità modificata da “${formatTitleCasePhrase(p)}” a “${formatTitleCasePhrase(d)}”`;
  }
  if (campo === "Ore lavoro" || campo === "Ore Lavoro") {
    return `Ore lavoro aggiornate da ${p} a ${d}`;
  }
  if (campo === "Addetto") {
    return `Addetto modificato da ${formatTitleCasePhrase(p)} a ${formatTitleCasePhrase(d)}`;
  }
  if (campo === "Foto") {
    return d === "Foto rimossa" ? "Foto rimossa" : "Foto aggiunta";
  }
  if (campo === "Prezzo vendita" || campo === "Prezzo listino OE" || campo === "Prezzo alternativo") {
    return `${campo} modificato da ${p} a ${d}`;
  }
  if (campo === "Scorta minima") {
    return `Scorta minima modificata da ${p} a ${d}`;
  }
  if (campo === "Fornitore alternativo" || campo === "Codice alternativo") {
    return `${campo} modificato da ${formatTitleCasePhrase(p)} a ${formatTitleCasePhrase(d)}`;
  }
  if (campo === "Markup %") {
    return `Markup modificato da ${p} a ${d}`;
  }
  if (campo === "Targa") {
    return `Targa modificata da ${formatTargaDisplay(p)} a ${formatTargaDisplay(d)}`;
  }
  if (campo === "Macchina" || campo === "Cliente" || campo === "Utilizzatore" || campo === "Matricola") {
    return `${campo}: aggiornato da ${formatTitleCasePhrase(p)} a ${formatTitleCasePhrase(d)}`;
  }
  if (campo === "Note" || campo === "Note interne") {
    return `Note aggiornate`;
  }
  if (campo.startsWith("Data ")) {
    return `${campo}: da ${p} a ${d}`;
  }
  if (campo === "Sincronizzazione") {
    return d !== "—" ? formatTitleCasePhrase(d) : "Dato anagrafica iniziale";
  }
  return `${campo} modificato da ${p} a ${d}`;
}

export function buildModificaRigaFromChanges(changes: CampoChangeLike[]): string {
  const filtered = filterAuditMetadataCampoChanges(changes);
  if (!filtered.length) return "—";
  return toBulletModificaRiga(filtered.map(sentenceForCampoChange));
}

/** Rimuove prefisso autore dal vecchio riepilogo (solo testo residuo). */
export function stripAutoreFromRiepilogo(riepilogo: string, autore: string): string {
  const r = safeStr(riepilogo).trim();
  const a = safeStr(autore).trim();
  if (!a) return r;
  const dash = `${a} — `;
  if (r.startsWith(dash)) return r.slice(dash.length).trim();
  try {
    const escaped = a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`^${escaped}\\s+ha\\s+`, "i");
    if (re.test(r)) return r.replace(re, "").trim();
  } catch {
    /* ignore */
  }
  return r;
}

function magazzinoTipoRiga(entry: MagazzinoLogEntryLike): string {
  if (entry.tipo === "aggiunta") return "CREAZIONE RICAMBIO";
  if (entry.tipo === "rimozione") return "ELIMINAZIONE RICAMBIO";
  return "AGGIORNAMENTO RICAMBIO";
}

function magazzinoToneForEntry(entry: MagazzinoLogEntryLike): GestionaleLogEventTone {
  if (entry.annullato) return "neutral";
  if (entry.tipo === "aggiunta") return "create";
  if (entry.tipo === "rimozione") return "delete";
  const label = magazzinoTipoRiga(entry);
  if (label === "ENTRATA") return "create";
  if (label === "USCITA") return "delete";
  return "update";
}

export type MezziLogEntryLike = {
  tipo: "aggiunta" | "update" | "rimozione";
  mezzo: string;
  riepilogo: string;
  autore: string;
  at: string;
  changes: CampoChangeLike[];
};

function mezziTipoRiga(tipo: MezziLogEntryLike["tipo"]): string {
  if (tipo === "aggiunta") return "CREAZIONE MEZZO";
  if (tipo === "rimozione") return "ELIMINAZIONE MEZZO";
  return "AGGIORNAMENTO MEZZO";
}

function mezziLeadLine(entry: MezziLogEntryLike): string | null {
  const who = formatLogAuthorDisplay(entry.autore);
  const cosa = formatTitleCasePhrase(entry.mezzo);
  if (entry.tipo === "aggiunta") {
    return `${who} ha registrato il mezzo ${cosa}`;
  }
  if (entry.tipo === "rimozione") {
    return `${who} ha rimosso il mezzo ${cosa}`;
  }
  return null;
}

export function buildMezziGestionaleLogViewModel(entry: MezziLogEntryLike): GestionaleLogViewModel {
  const tone = gestionaleLogToneMagazzino(entry.tipo);
  const tipoRiga = mezziTipoRiga(entry.tipo);
  const oggettoRiga = formatTitleCasePhrase(entry.mezzo);
  let modificaRiga: string;
  if (entry.tipo === "aggiunta") {
    const lead = mezziLeadLine(entry);
    modificaRiga = toBulletModificaRiga([lead ?? "Nuovo mezzo registrato in anagrafica"]);
  } else if (entry.tipo === "rimozione") {
    const lead = mezziLeadLine(entry);
    modificaRiga = toBulletModificaRiga([lead ?? "Mezzo rimosso dall'anagrafica"]);
  } else if (entry.changes.length) {
    modificaRiga = buildModificaRigaFromChanges(entry.changes);
  } else {
    const fb = stripAutoreFromRiepilogo(entry.riepilogo, entry.autore);
    modificaRiga = fb ? toBulletModificaRiga([fb]) : "—";
  }
  return {
    tone,
    tipoRiga,
    oggettoRiga,
    modificaRiga,
    autore: entry.autore,
    atIso: entry.at,
  };
}

function magazzinoLeadLine(entry: MagazzinoLogEntryLike): string | null {
  const who = formatLogAuthorDisplay(entry.autore);
  const cosa = formatTitleCasePhrase(entry.ricambio);
  if (entry.tipo === "aggiunta") {
    return `${who} ha creato il ricambio ${cosa}`;
  }
  if (entry.tipo === "rimozione") {
    return `${who} ha eliminato il ricambio ${cosa}`;
  }
  return null;
}

export function buildMagazzinoGestionaleLogViewModel(entry: MagazzinoLogEntryLike): GestionaleLogViewModel {
  const tipoRiga = magazzinoTipoRiga(entry);
  const tone = magazzinoToneForEntry(entry);
  const oggettoRiga = formatTitleCasePhrase(entry.ricambio);

  const lead = magazzinoLeadLine(entry);
  let modificaRiga: string;
  if (entry.tipo === "aggiunta") {
    const bullets: string[] = [lead ?? "Nuovo ricambio creato in magazzino"];
    if (entry.changes.length > 0) {
      const detailLines = filterAuditMetadataCampoChanges(
        entry.changes.filter((c) => c.campo !== "Sincronizzazione"),
      ).map(sentenceForCampoChange);
      if (detailLines.length) bullets.push(...detailLines);
    }
    modificaRiga = toBulletModificaRiga(bullets);
  } else if (entry.tipo === "rimozione") {
    modificaRiga = toBulletModificaRiga([lead ?? "Ricambio eliminato dal magazzino"]);
  } else if (entry.changes.length) {
    const lines = filterAuditMetadataCampoChanges(
      entry.changes.filter((c) => c.campo !== "Sincronizzazione"),
    ).map(sentenceForCampoChange);
    modificaRiga = toBulletModificaRiga(lines.length ? lines : ["Modifica registrata"]);
  } else {
    const fb = stripAutoreFromRiepilogo(entry.riepilogo, entry.autore);
    modificaRiga = fb ? toBulletModificaRiga([fb]) : "—";
  }

  return {
    tone,
    tipoRiga,
    oggettoRiga,
    modificaRiga,
    autore: entry.autore,
    atIso: entry.at,
    annullato: entry.annullato === true,
  };
}

function lavorazioniTipoRiga(tipo: LavorazioniLogTipo): string {
  switch (tipo) {
    case "creazione":
      return "CREAZIONE LAVORAZIONE";
    case "completata":
      return "AGGIORNAMENTO LAVORAZIONE";
    case "archiviazione":
      return "ARCHIVIAZIONE LAVORAZIONE";
    case "eliminazione":
      return "ELIMINAZIONE LAVORAZIONE";
    case "riaperta":
      return "RIPRISTINO LAVORAZIONE";
    case "aggiornamento":
    default:
      return "AGGIORNAMENTO LAVORAZIONE";
  }
}

function formatLavorazioneOggettoLine(titolo: string): string {
  const t = safeStr(titolo).trim();
  if (!t) return "—";
  const parts = t.split(/\s*(?:—|·)\s*/).map((x) => formatTitleCasePhrase(x.trim()));
  return parts.filter((p) => p && p !== "—").join(" · ");
}

export function buildLavorazioniGestionaleLogViewModel(entry: LavorazioniLogEntry): GestionaleLogViewModel {
  const tone = gestionaleLogToneLavorazioni(entry.tipo);
  const tipoRiga = lavorazioniTipoRiga(entry.tipo);
  const schedaOggetto = safeStr(entry.schedaOggetto).trim();
  const oggettoRiga = schedaOggetto || formatLavorazioneOggettoLine(entry.titolo);

  let modificaRiga: string;
  if (entry.tipo === "creazione" && schedaOggetto) {
    modificaRiga = toBulletModificaRiga([entry.riepilogo.trim() || "Scheda creata"]);
  } else if (entry.tipo === "creazione") {
    modificaRiga = toBulletModificaRiga(["Creata nuova lavorazione"]);
  } else if (entry.tipo === "archiviazione") {
    modificaRiga = toBulletModificaRiga(["Spostata in archivio"]);
  } else if (entry.tipo === "eliminazione" && schedaOggetto) {
    modificaRiga = toBulletModificaRiga([entry.riepilogo.trim() || "Scheda eliminata"]);
  } else if (entry.changes.length) {
    modificaRiga = buildModificaRigaFromChanges(entry.changes);
  } else {
    const stripped = stripAutoreFromRiepilogo(entry.riepilogo, entry.autore);
    modificaRiga = stripped ? toBulletModificaRiga([stripped]) : "—";
  }

  return {
    tone,
    tipoRiga,
    oggettoRiga,
    modificaRiga,
    autore: entry.autore,
    atIso: entry.at,
  };
}
