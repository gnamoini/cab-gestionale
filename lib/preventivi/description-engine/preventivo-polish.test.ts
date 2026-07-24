import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildDescriptionInputFromBundle,
  buildTechnicalFingerprint,
} from "@/lib/preventivi/description-engine/resolve-description-input";
import {
  updateGuardContextLineCount,
  validatePolishOutput,
} from "@/lib/preventivi/description-engine/polish-guard";
import {
  buildPolishCacheKey,
  getPolishCache,
  resetPolishCacheForTests,
  setPolishCache,
} from "@/lib/preventivi/description-engine/polish-cache.server";
import type { LavorazioneSchedeBundle } from "@/types/schede";

const lavId = "550e8400-e29b-41d4-a716-446655440001";

function bundleWithLavorazioni(lines: string[]): LavorazioneSchedeBundle {
  return {
    lavorazioneId: lavId,
    ingresso: {
      tipo: "ingresso",
      sorgente: "generata",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
      createdBy: "Test",
      updatedBy: "Test",
      fileEsterno: null,
      campi: {
        dataIngresso: "2026-01-01",
        cliente: "Cliente",
        cantiere: "",
        utilizzatore: "",
        tipoAttrezzatura: "",
        marcaAttrezzatura: "",
        modelloAttrezzatura: "",
        matricola: "",
        nScuderia: "",
        oreLavoro: "",
        tipoTelaio: "",
        marcaTelaio: "",
        modelloTelaio: "",
        vin: "",
        targa: "",
        km: "",
        descrizioneAnomalia: "",
        livelloCarburante: "",
        addettoAccettazione: "",
        richiedente: "",
        richiedenteTelefono: "",
        noteIntervento: "",
      },
    },
    lavorazioni: {
      tipo: "lavorazioni",
      sorgente: "generata",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
      createdBy: "Test",
      updatedBy: "Test",
      fileEsterno: null,
      campi: {
        identificazioneMacchina: "",
        righe: lines.map((lavorazioniEffettuate, i) => ({
          id: `r-${i}`,
          dataLavorazione: "2026-01-01",
          lavorazioniEffettuate,
          addettiAssegnati: [],
        })),
      },
    },
    ricambi: null,
  };
}

test("SSOT: bundle DB Smontaggio pompa — mai snapshot OCR stale", () => {
  const resolved = buildDescriptionInputFromBundle(bundleWithLavorazioni(["Smontaggio pompa"]));
  assert.ok(resolved.technicalBlob.includes("Smontaggio pompa"));
  assert.ok(!resolved.technicalBlob.includes("S. montaggio"));
  assert.deepEqual(resolved.lavorazioniLines, ["Smontaggio pompa"]);
});

test("guard: espansione abbreviazioni consentita", () => {
  const pre = "- Pul. filtro\n- Rim. coperchio";
  const post = "- Pulizia filtro\n- Rimontaggio del coperchio";
  const guard = updateGuardContextLineCount(
    { lineCount: 0, ricambiCodes: [], ricambiQuantities: [], sourceText: "Pul. filtro" },
    pre,
  );
  const result = validatePolishOutput(pre, post, guard);
  assert.equal(result.ok, true);
});

test("guard: nuova attività collaudo → reject", () => {
  const pre = "- Sostituzione filtro idraulico";
  const post = "- Sostituzione filtro idraulico e collaudo completo mezzo";
  const guard = updateGuardContextLineCount(
    { lineCount: 0, ricambiCodes: [], ricambiQuantities: [], sourceText: pre },
    pre,
  );
  const result = validatePolishOutput(pre, post, guard);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "forbidden_new_activity");
});

test("guard: testo identico → ok", () => {
  const text = "- Smontaggio pompa";
  const guard = updateGuardContextLineCount(
    { lineCount: 0, ricambiCodes: [], ricambiQuantities: [], sourceText: text },
    text,
  );
  assert.equal(validatePolishOutput(text, text, guard).ok, true);
});

test("cache: stesso hash → cache hit", () => {
  resetPolishCacheForTests();
  const fp = buildTechnicalFingerprint({
    lavorazioniLines: ["Smontaggio pompa"],
    ricambi: [],
  });
  const key = buildPolishCacheKey("- Smontaggio pompa", fp);
  setPolishCache(key, "- Smontaggio pompa migliorata", true);
  const hit = getPolishCache(key);
  assert.ok(hit);
  assert.equal(hit.applied, true);
});

test("cache key cambia con technicalFingerprint diverso", () => {
  const desc = "- Smontaggio pompa";
  const k1 = buildPolishCacheKey(desc, "fp-a");
  const k2 = buildPolishCacheKey(desc, "fp-b");
  assert.notEqual(k1, k2);
});

console.log("preventivo-polish.test.ts OK");
