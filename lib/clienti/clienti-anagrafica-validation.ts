import type { ClienteAnagrafica, ClienteContatto, ClienteSedeFields } from "@/lib/clienti/clienti-anagrafica-types";
import { EMAIL_RE } from "@/lib/validation/email";

export type ClienteAnagraficaValidationIssue = {
  field: string;
  message: string;
};

const PIVA_RE = /^\d{11}$/;
const SDI_RE = /^[A-Z0-9]{7}$/i;
const CAP_IT_RE = /^\d{5}$/;
const PROVINCIA_RE = /^[A-Z]{2}$/i;

export function validatePartitaIva(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (!PIVA_RE.test(v)) return "Partita IVA: 11 cifre numeriche.";
  return null;
}

export function validateCodiceDestinatario(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (!SDI_RE.test(v)) return "Codice destinatario: 7 caratteri alfanumerici.";
  return null;
}

export function validateSedeFields(fields: ClienteSedeFields, prefix: string): ClienteAnagraficaValidationIssue[] {
  const issues: ClienteAnagraficaValidationIssue[] = [];
  const stato = fields.stato.trim().toUpperCase() || "IT";
  if (fields.cap.trim() && stato === "IT" && !CAP_IT_RE.test(fields.cap.trim())) {
    issues.push({ field: `${prefix}.cap`, message: "CAP: 5 cifre." });
  }
  if (fields.provincia.trim() && !PROVINCIA_RE.test(fields.provincia.trim())) {
    issues.push({ field: `${prefix}.provincia`, message: "Provincia: 2 lettere." });
  }
  return issues;
}

export function validateContattoValore(tipo: ClienteContatto["tipo"], valore: string): string | null {
  const v = valore.trim();
  if (!v) return "Valore obbligatorio.";
  if (tipo === "email" || tipo === "pec") {
    if (!EMAIL_RE.test(v)) return "Email non valida.";
  }
  if (tipo === "sito_web" && !/^https?:\/\//i.test(v) && !v.includes(".")) {
    return "URL non valido.";
  }
  return null;
}

export function validateClienteAnagrafica(model: ClienteAnagrafica): ClienteAnagraficaValidationIssue[] {
  const issues: ClienteAnagraficaValidationIssue[] = [];
  const piva = validatePartitaIva(model.partitaIva);
  if (piva) issues.push({ field: "partitaIva", message: piva });
  const sdi = validateCodiceDestinatario(model.codiceDestinatario);
  if (sdi) issues.push({ field: "codiceDestinatario", message: sdi });
  issues.push(...validateSedeFields(model.sedi.operativa, "sedi.operativa"));
  if (!model.sedeLegaleUgualeOperativa) {
    issues.push(...validateSedeFields(model.sedi.legale, "sedi.legale"));
  }
  for (const c of model.contatti) {
    if (!c.etichetta.trim()) {
      issues.push({ field: `contatti.${c.id}.etichetta`, message: "Nome identificativo obbligatorio." });
    }
    const valErr = validateContattoValore(c.tipo, c.valore);
    if (valErr) issues.push({ field: `contatti.${c.id}.valore`, message: valErr });
  }
  return issues;
}
