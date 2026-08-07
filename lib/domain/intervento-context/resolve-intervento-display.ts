import { auditInterventoContext } from "@/lib/domain/intervento-context/intervento-audit";
import { normalizeInterventoIdent } from "@/lib/domain/intervento-context/intervento-ident";
import type {
  InterventoContext,
  InterventoDisplay,
  InterventoDisplayField,
  InterventoIdent,
  InterventoSourceOfTruth,
} from "@/lib/domain/intervento-context/intervento-context.types";

function isSchedaFieldValue(key: string, value: string): boolean {
  const t = value.trim();
  if (!t) return false;
  if (t === "—") return false;
  if (key === "matricola" && t.toLowerCase() === "non assegnata") return false;
  return true;
}

function resolveSnapshotOnlyField(value: string | undefined, key: string): InterventoDisplayField {
  const raw = value ?? "";
  if (isSchedaFieldValue(key, raw)) {
    return { value: raw.trim(), source: "scheda" };
  }
  return { value: "", source: "scheda" };
}

function resolveField(
  schedaValue: string,
  lavorazioneValue: string,
  mezzoValue: string,
  key: string,
): InterventoDisplayField {
  if (isSchedaFieldValue(key, schedaValue)) {
    return { value: schedaValue.trim(), source: "scheda" };
  }
  if (lavorazioneValue.trim()) {
    return { value: lavorazioneValue.trim(), source: "lavorazione" };
  }
  if (mezzoValue.trim() && mezzoValue.trim() !== "—") {
    return { value: mezzoValue.trim(), source: "mezzo" };
  }
  return { value: "", source: "mezzo" };
}

function primarySourceFromDisplay(display: Omit<InterventoDisplay, "primarySource" | "ident">): InterventoSourceOfTruth {
  const fields = [
    display.cliente,
    display.marcaModello,
    display.targa,
    display.matricola,
    display.nScuderia,
  ];
  if (fields.some((f) => f.source === "scheda" && f.value)) return "scheda";
  if (fields.some((f) => f.source === "scheda")) return "scheda";
  if (fields.some((f) => f.source === "lavorazione" && f.value)) return "lavorazione";
  return "mezzo";
}

/** Ident per display: se esiste snapshot scheda usa solo quello (parità lista). */
export function resolveInterventoIdent(ctx: InterventoContext): InterventoIdent {
  const c = ctx.schedaIngresso.campi;
  if (c) {
    return normalizeInterventoIdent({
      targa: c.targa,
      matricola: c.matricola,
      nScuderia: c.nScuderia,
    });
  }
  return { ...ctx.ident };
}

export function resolveInterventoDisplay(ctx: InterventoContext): InterventoDisplay {
  /** Campi snapshot se presenti (anche file_esterno — parità lista lavorazioni). */
  const scheda = ctx.schedaIngresso.campi;
  const lav = ctx.lavorazione;
  const mezzo = ctx.mezzo;

  const marcaScheda = [scheda?.marcaAttrezzatura, scheda?.modelloAttrezzatura]
    .map((s) => (s ?? "").trim())
    .filter((s) => s.length > 0 && s !== "—")
    .join(" ");
  const marcaMezzo = [mezzo.marca, mezzo.modello]
    .map((s) => (s ?? "").trim())
    .filter((s) => s.length > 0 && s !== "—")
    .join(" ");
  const marcaLav = "";

  const display: Omit<InterventoDisplay, "primarySource"> = scheda
    ? {
        cliente: resolveSnapshotOnlyField(scheda.cliente, "cliente"),
        utilizzatore: resolveSnapshotOnlyField(scheda.utilizzatore, "utilizzatore"),
        cantiere: resolveSnapshotOnlyField(scheda.cantiere, "cantiere"),
        marcaModello: resolveSnapshotOnlyField(marcaScheda, "marca"),
        targa: resolveSnapshotOnlyField(scheda.targa, "targa"),
        matricola: resolveSnapshotOnlyField(scheda.matricola, "matricola"),
        nScuderia: resolveSnapshotOnlyField(scheda.nScuderia, "nScuderia"),
        ident: resolveInterventoIdent(ctx),
      }
    : {
        cliente: resolveField("", lav.cliente, mezzo.cliente, "cliente"),
        utilizzatore: resolveField("", lav.utilizzatore, mezzo.utilizzatore, "utilizzatore"),
        cantiere: resolveField("", lav.cantiere, mezzo.cantiere, "cantiere"),
        marcaModello: resolveField("", marcaLav, marcaMezzo, "marca"),
        targa: resolveField("", lav.targa, mezzo.targa, "targa"),
        matricola: resolveField("", lav.matricola, mezzo.matricola, "matricola"),
        nScuderia: resolveField("", lav.nScuderia, mezzo.nScuderia, "nScuderia"),
        ident: resolveInterventoIdent(ctx),
      };

  const resolved: InterventoDisplay = {
    ...display,
    primarySource: primarySourceFromDisplay(display),
  };

  auditInterventoContext(ctx, "display", {
    sourceOfTruthUsed: resolved.primarySource,
    mismatch: ctx.meta.hasIdentMismatch,
  });

  return resolved;
}

/** Etichetta macchina per lista (parità con lavorazioneMacchinaLabel). */
export function interventoMacchinaLabel(display: InterventoDisplay): string {
  const v = display.marcaModello.value.trim();
  return v || "—";
}

/** Etichetta cliente per lista (parità con lavorazioneClienteLabel). */
export function interventoClienteLabel(display: InterventoDisplay): string {
  return display.cliente.value.trim() || "—";
}

/** Etichetta ident mezzo per lista (parità con lavorazioneMezzoIdent). */
export function interventoMezzoIdentLabel(display: InterventoDisplay): string {
  const p = display.ident;
  const parts = [p.targa, p.matricola, p.nScuderia ? `N. ${p.nScuderia}` : ""].filter(Boolean);
  return parts.join(" · ");
}
