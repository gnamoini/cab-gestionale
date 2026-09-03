/**
 * Probe READ-ONLY con diagnostica HTTP (nessuna write).
 */
import { readUnoerpBaseUrl, readUnoerpTimeoutMs } from "@/lib/env/unoerp.server";
import { resolveUnoerpAuthToken } from "@/lib/integrations/unoerp/auth-connection";
import { buildUnoerpFormBody, UNOERP_FORM_CONTENT_TYPE } from "@/lib/integrations/unoerp/request-encoding";

export type ProbeResult = {
  act: string;
  module: string;
  file: string;
  httpStatus: number;
  ok: boolean;
  bodySnippet: string;
  parsed: unknown;
  errorMessage: string | null;
};

const SENSITIVE = /(auth|password|token|authorization|email|pec|iban|piva|partita|cognome|nome|ragsoc)/i;

function sanitizeSnippet(text: string, max = 400): string {
  let s = text.replace(/"auth"\s*:\s*"[^"]+"/gi, '"auth":"[REDACTED]"');
  s = s.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL_REDACTED]");
  if (s.length > max) return `${s.slice(0, max)}…`;
  return s;
}

export async function probeUnoerpReadonly(
  act: "info" | "index" | "show",
  module: string,
  file: string,
  extra: Record<string, unknown> = {},
): Promise<ProbeResult> {
  const base = readUnoerpBaseUrl();
  if (!base) throw new Error("UNOERP_BASE_URL missing");
  const url = `${base.replace(/\/$/, "")}/intranet/api.php`;
  const auth = await resolveUnoerpAuthToken();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), readUnoerpTimeoutMs());
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": UNOERP_FORM_CONTENT_TYPE, Accept: "application/json" },
      body: buildUnoerpFormBody({ auth, act, module, file, ...extra }),
      signal: ctrl.signal,
      cache: "no-store",
    });
    const text = await res.text();
    let parsed: unknown = null;
    let errorMessage: string | null = null;
    if (text.trim()) {
      try {
        parsed = JSON.parse(text);
        if (parsed && typeof parsed === "object") {
          const o = parsed as Record<string, unknown>;
          if ("error" in o) errorMessage = String(o.error);
          if ("message" in o) errorMessage = errorMessage ?? String(o.message);
          if ("errore" in o) errorMessage = errorMessage ?? String(o.errore);
        }
      } catch {
        errorMessage = "non-json body";
      }
    }
    return {
      act,
      module,
      file,
      httpStatus: res.status,
      ok: res.ok,
      bodySnippet: sanitizeSnippet(text),
      parsed: res.ok ? parsed : null,
      errorMessage,
    };
  } finally {
    clearTimeout(t);
  }
}

export function classifyHttp500(probes: ProbeResult[]): {
  classification: string;
  confidence: "high" | "medium" | "low";
  evidence: string;
} {
  const info = probes.find((p) => p.act === "info");
  const index = probes.find((p) => p.act === "index");
  const show = probes.find((p) => p.act === "show");

  const all404 = probes.every((p) => p.httpStatus === 404);
  if (all404) {
    return { classification: "MODULE_NOT_FOUND", confidence: "high", evidence: "all acts 404" };
  }

  const info404 = info?.httpStatus === 404;
  if (info404) {
    return { classification: "MODULE_NOT_FOUND", confidence: "high", evidence: "info 404" };
  }

  const info500 = info?.httpStatus === 500;
  const index404 = index?.httpStatus === 404;
  const index500 = index?.httpStatus === 500;
  const msg = [info, index, show].map((p) => p?.errorMessage).filter(Boolean).join(" | ");

  if (info500 && index404) {
    return {
      classification: "UNKNOWN_500",
      confidence: "medium",
      evidence: `info=500 index=404 (empty body — permesso, modulo non esposto, o errore interno non distinguibile)${msg ? `; ${msg}` : ""}`,
    };
  }
  if (info500 && index500) {
    if (/permess|autorizz|denied|forbidden|accesso/i.test(msg)) {
      return { classification: "PERMISSION_DENIED", confidence: "medium", evidence: msg || "500 on info+index" };
    }
    return { classification: "SERVER_ERROR", confidence: "medium", evidence: msg || "500 on info+index" };
  }

  if (info?.ok && index?.httpStatus === 500) {
    return { classification: "SERVER_ERROR", confidence: "medium", evidence: "info ok, index 500" };
  }

  if (show?.httpStatus === 404 || show?.httpStatus === 500) {
    if (!info?.ok) {
      return { classification: "UNKNOWN_500", confidence: "low", evidence: "show failed after info failure" };
    }
    return { classification: "INVALID_PARAMETERS", confidence: "medium", evidence: "show without valid row" };
  }

  if (info?.ok) {
    return { classification: "READABLE", confidence: "high", evidence: "info ok" };
  }

  return { classification: "UNKNOWN_500", confidence: "low", evidence: msg || "inconclusive" };
}

export type FieldMeta = {
  field: string;
  label: string | null;
  format: string | null;
  insert_ignore: boolean | null;
  valoriKeys: string[];
  valoriSample: unknown;
  extraKeys: string[];
};

export function extractFieldMeta(fieldset: Record<string, Record<string, unknown>> | undefined): FieldMeta[] {
  if (!fieldset) return [];
  return Object.entries(fieldset).map(([field, meta]) => {
    const valori = meta.valori;
    let valoriKeys: string[] = [];
    let valoriSample: unknown = null;
    if (valori && typeof valori === "object") {
      valoriKeys = Object.keys(valori as object).slice(0, 8);
      if (Array.isArray(valori)) valoriSample = (valori as unknown[]).slice(0, 3);
      else valoriSample = Object.fromEntries(Object.entries(valori as object).slice(0, 3));
    }
    const extraKeys = Object.keys(meta).filter((k) => !["label", "format", "insert_ignore", "valori"].includes(k));
    return {
      field,
      label: (meta.label as string | null) ?? null,
      format: (meta.format as string) ?? null,
      insert_ignore: (meta.insert_ignore as boolean) ?? null,
      valoriKeys,
      valoriSample: sanitizeValoriSample(valoriSample),
      extraKeys,
    };
  });
}

function sanitizeValoriSample(v: unknown): unknown {
  if (v == null) return v;
  if (typeof v === "string") {
    if (SENSITIVE.test(v) || v.length > 60) return "[REDACTED]";
    return v;
  }
  if (Array.isArray(v)) return v.map(sanitizeValoriSample);
  if (typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = sanitizeValoriSample(val);
    }
    return out;
  }
  return v;
}

export function extractLivesearchHints(fields: FieldMeta[]): Array<{
  field: string;
  format: string | null;
  label: string | null;
  inferredTarget: string | null;
  evidence: string;
}> {
  const out: Array<{
    field: string;
    format: string | null;
    label: string | null;
    inferredTarget: string | null;
    evidence: string;
  }> = [];
  for (const f of fields) {
    const fmt = (f.format ?? "").toLowerCase();
    if (!["livesearch", "menu", "gerarchic", "task"].includes(fmt)) continue;
    let inferred: string | null = null;
    let evidence = `format=${f.format}`;
    const sampleStr = JSON.stringify(f.valoriSample ?? "");
    if (/client|anagraf/i.test(`${f.field} ${f.label ?? ""}`)) {
      inferred = "Base/clienti (inferred, NOT VERIFIED readable)";
      evidence += "; field name suggests customer";
    }
    if (f.field === "anagrafica_id" || f.field === "cliente_id") {
      inferred = "Base/clienti (inferred from field name)";
    }
    if (f.field.includes("iva")) inferred = "Base/iva";
    if (f.field.includes("unita_misura")) inferred = "Base/unita_misura";
    if (f.field.includes("sezionale")) inferred = "Amministrazione/sezionali";
    if (f.field.includes("causale")) inferred = "Magazzino/causali_magazzino or causali_trasporto";
    if (f.field.includes("articoli") || f.field === "alpha_cod") inferred = "Magazzino/articoli";
    if (f.field === "task_id" || fmt === "task") inferred = "Produzione/task";
    if (sampleStr.includes("module") || sampleStr.includes("file")) {
      evidence += "; valori contains module/file hint";
      inferred = sampleStr.slice(0, 120);
    }
    if (f.extraKeys.length) evidence += `; extra=${f.extraKeys.join(",")}`;
    out.push({ field: f.field, format: f.format, label: f.label, inferredTarget: inferred, evidence });
  }
  return out;
}

const CORRELATION_PATTERN =
  /source|external|integraz|import|ref|uuid|token|id_esterno|codice_esterno|metadata|custom|note_integrazioni/i;

export function findCorrelationCandidates(fields: FieldMeta[]): Array<{
  field: string;
  label: string | null;
  format: string | null;
  insert_ignore: boolean | null;
  searchable: string;
  acceptable: string;
}> {
  return fields
    .filter((f) => CORRELATION_PATTERN.test(`${f.field} ${f.label ?? ""}`))
    .map((f) => ({
      field: f.field,
      label: f.label,
      format: f.format,
      insert_ignore: f.insert_ignore,
      searchable: "NOT_VERIFIED",
      acceptable: "NOT_ACCEPTABLE_AS_CORRELATION_KEY",
    }));
}
