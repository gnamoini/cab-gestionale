import assert from "node:assert/strict";
import { createInMemoryKnownCorrectionsStore, emptyKnownCorrectionsStore, toKnownCorrectionRow } from "@/lib/entity-resolution/known-corrections";
import { emptyResolutionCacheStore } from "@/lib/entity-resolution/resolution-cache";
import { buildAliasLookupMap } from "@/lib/entity-resolution/settings-aliases";
import { resolveEntity } from "@/lib/entity-resolution/entity-resolver";
import { buildEntityResolutionIndex } from "@/lib/entity-resolution/entity-resolution-index";
import { resolveCaptureGraph } from "@/lib/entity-resolution/resolve-capture-graph";
import type { ResolutionDataSources } from "@/lib/entity-resolution/build-resolution-context";
import { createMezziListePrefsDefault } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import type { CabAppSettingsResolved } from "@/src/lib/app-settings/resolve-from-rows";

function mockSettings(overrides: Partial<CabAppSettingsResolved["mezziListe"]> = {}): CabAppSettingsResolved {
  return {
    lavorazioni: {
      stati: [],
      addettiRecords: [{ id: "a1", nome: "Mario", cognome: "Rossi" }],
      addetti: ["Mario"],
      addettoColors: {},
      prioritaColors: {},
      prioritaDb: [],
    },
    mezziListe: { ...createMezziListePrefsDefault(), marche: ["SCHMIDT", "SCHMID", "IVECO"], modelli: ["Swingo"], ...overrides },
    magazzinoMaster: {
      marche: [],
      categorie: [],
      fornitori: [],
      fornitoriOrdine: [],
      mezziCompatibili: [],
      produttori: [],
    },
    preventiviDefaults: { costoOrarioDefault: 48 },
    dipendenti: { tipiAssenza: [] },
    branding: { nomeAzienda: "Test" },
  } as unknown as CabAppSettingsResolved;
}

async function run() {
  const aliasMap = buildAliasLookupMap({
    "MARCA:SCHMIDT": ["SCHMIDT SRL", "SCHMIDT SPA"],
    "MARCA:IVECO": ["IVECO SPA", "IVECO TRUCKS"],
  });

  const index = buildEntityResolutionIndex({
    poolsByType: {
      MARCA: [
        { id: null, label: "SCHMIDT" },
        { id: null, label: "SCHMID" },
        { id: null, label: "IVECO" },
      ],
    },
    aliasMap,
  });

  const corrections = createInMemoryKnownCorrectionsStore([
    toKnownCorrectionRow({
      entityType: "MARCA",
      ocrValue: "SCMIDT",
      resolvedLabel: "SCHMIDT",
      source: "manual_confirm",
    }),
  ]);

  async function resolveMarca(value: string) {
    return resolveEntity({
      entityType: "MARCA",
      fieldKey: "marca_attrezzatura",
      originalValue: value,
      pool: index.poolsByType.get("MARCA") ?? [],
      parentFieldKeys: [],
      index,
      corrections,
      cache: emptyResolutionCacheStore(),
    });
  }

  {
    const r = await resolveMarca("schmidt");
    assert.equal(r.status, "resolved");
    assert.equal(r.resolvedLabel, "SCHMIDT");
    assert.equal(r.reason, "exact_match");
  }

  {
    const r = await resolveMarca("SCHMIDT SRL");
    assert.equal(r.status, "resolved");
    assert.equal(r.resolvedLabel, "SCHMIDT");
    assert.ok(r.reason === "canonical_legal_suffix" || r.reason === "alias_settings");
  }

  {
    const r = await resolveMarca("SCHMIDT SPA");
    assert.equal(r.status, "resolved");
    assert.equal(r.resolvedLabel, "SCHMIDT");
  }

  {
    const r = await resolveMarca("SCMIDT");
    assert.equal(r.status, "resolved");
    assert.equal(r.resolvedLabel, "SCHMIDT");
    assert.equal(r.reason, "known_ocr_correction");
  }

  {
    const r = await resolveMarca("SCHMI");
    assert.equal(r.status, "ambiguous");
    assert.ok(r.candidateList.length >= 2);
  }

  {
    const sources: ResolutionDataSources = {
      settings: mockSettings({ attrezzature: [{ id: "m1", nome: "SCHMIDT", modelli: [{ id: "mo1", nome: "Swingo" }] }] }),
      magazzino: [],
      mezzi: [],
    };
    const graph = await resolveCaptureGraph(
      [
        { field_key: "marca_attrezzatura", raw_value: "SCHMIDT SRL" },
        { field_key: "modello_attrezzatura", raw_value: "Swingo" },
      ],
      {
        sources,
        aliases: { "MARCA:SCHMIDT": ["SCHMIDT SRL"] },
        corrections: emptyKnownCorrectionsStore(),
        cache: emptyResolutionCacheStore(),
      },
    );
    const marca = graph.fields.find((f) => f.field_key === "marca_attrezzatura");
    const modello = graph.fields.find((f) => f.field_key === "modello_attrezzatura");
    assert.equal(marca?.resolution.resolvedLabel, "SCHMIDT");
    assert.equal(modello?.resolution.resolvedLabel, "Swingo");
  }

  console.log("entity-resolution.test.ts OK");
}

void run();
