import { canonicalizeDraftBundle } from "./canonicalize";
import { sha256Canonical } from "./hash";
import type { CatalogActivity, TkbDraftBundle, TkbPublishedSnapshot } from "./types";

const ACTIVITY_ID_RE = /^[a-z0-9_]{4,80}$/;

export class TkbValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TkbValidationError";
  }
}

function validateActivity(a: CatalogActivity, ctx: string): void {
  if (!ACTIVITY_ID_RE.test(a.activityId)) {
    throw new TkbValidationError(`${ctx}: activityId invalido "${a.activityId}"`);
  }
  if (!a.text.trim()) throw new TkbValidationError(`${ctx}: text vuoto per ${a.activityId}`);
}

export function validateTkbDraftBundle(bundle: TkbDraftBundle): void {
  for (const p of bundle.procedure) {
    for (const a of [...p.attivita, ...(p.controlliFinali ?? [])]) {
      validateActivity(a, `procedure:${p.slug}`);
    }
  }
  for (const i of bundle.interventi) {
    for (const a of [
      ...i.attivitaPrincipali,
      ...(i.attivitaComplementari ?? []),
      ...(i.controlliFinali ?? []),
    ]) {
      validateActivity(a, `intervento:${i.slug}`);
    }
    for (const ov of i.activityOverrides ?? []) {
      if (ov.action === "replace" && !ov.replacement) {
        throw new TkbValidationError(`intervento:${i.slug}: replace senza replacement`);
      }
    }
    for (const procSlug of i.procedureSlugs ?? []) {
      if (!bundle.procedure.some((p) => p.slug === procSlug)) {
        throw new TkbValidationError(`intervento:${i.slug}: procedure mancante ${procSlug}`);
      }
    }
  }
}

export function buildPublishedSnapshot(
  bundle: TkbDraftBundle,
  kbVersion: number,
  publishedAt: string,
): TkbPublishedSnapshot {
  const stripped: TkbDraftBundle = {
    componenti: bundle.componenti,
    sintomi: bundle.sintomi,
    categorie: bundle.categorie,
    procedure: bundle.procedure,
    interventi: bundle.interventi,
    ricambiMap: bundle.ricambiMap,
    searchIndex: bundle.searchIndex,
  };
  validateTkbDraftBundle(stripped);
  return {
    schemaVersion: 1,
    kbVersion,
    publishedAt,
    componenti: stripped.componenti,
    sintomi: stripped.sintomi,
    categorie: stripped.categorie,
    procedure: stripped.procedure.map((p) => ({ ...p, publishStatus: "published" as const })),
    interventi: stripped.interventi.map((i) => ({ ...i, publishStatus: "published" as const })),
    ricambiMap: stripped.ricambiMap.filter((m) => m.active),
    searchIndex: stripped.searchIndex,
  };
}

export function hashDraftBundle(bundle: TkbDraftBundle): string {
  const { ...core } = bundle;
  return sha256Canonical(canonicalizeDraftBundle(core));
}

export function hashPublishedSnapshot(snapshot: TkbPublishedSnapshot): string {
  return sha256Canonical(canonicalizeDraftBundle({
    componenti: snapshot.componenti,
    sintomi: snapshot.sintomi,
    categorie: snapshot.categorie,
    procedure: snapshot.procedure,
    interventi: snapshot.interventi,
    ricambiMap: snapshot.ricambiMap,
    searchIndex: snapshot.searchIndex,
  }));
}
