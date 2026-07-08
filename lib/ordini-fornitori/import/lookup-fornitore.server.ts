import { mergeFornitoriOrdineOptions } from "@/lib/magazzino/fornitori-ordine-options";
import { normFornitoreAlternativoKey } from "@/lib/magazzino/fornitore-alternativo-sconto";
import {
  getFornitoreAnagraficaSettings,
  type FornitoreAnagraficaSettings,
} from "@/lib/magazzino/fornitore-anagrafica";
import type { MagazzinoMasterPrefs } from "@/lib/magazzino/magazzino-master-prefs-storage";
import {
  emptyOrdineFornitoreFornitoreSnapshot,
  type OrdineFornitoreFornitoreSnapshot,
} from "@/lib/ordini-fornitori/fornitore-snapshot";
import type { FornitoreMatchResult } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-types";
import { findSimilarSettingsDuplicate } from "@/lib/settings/settings-list-duplicate";
import {
  entityAutocompleteKey,
  findExactEntityInPool,
  normalizeEntityString,
} from "@/lib/validation/global-entity-validation";

function normPiva(value: string): string {
  return value.replace(/\D/g, "");
}

function normCf(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function buildAnagraficaIndex(mag: MagazzinoMasterPrefs): Array<{ label: string; anag: FornitoreAnagraficaSettings }> {
  const labels = mergeFornitoriOrdineOptions(mag);
  return labels.map((label) => ({
    label,
    anag: getFornitoreAnagraficaSettings(mag, label),
  }));
}

function snapshotFromExtracted(
  label: string,
  input: {
    ragioneSociale?: string;
    partitaIva?: string;
    codiceFiscale?: string;
    indirizzo?: string;
    telefono?: string;
  },
): OrdineFornitoreFornitoreSnapshot {
  const base = emptyOrdineFornitoreFornitoreSnapshot(label);
  return {
    ...base,
    label,
    ragioneSociale: input.ragioneSociale?.trim() || label,
    partitaIva: input.partitaIva?.trim() || "",
    codiceFiscale: input.codiceFiscale?.trim() || "",
    indirizzo: input.indirizzo?.trim() || "",
    telefono: input.telefono?.trim() || base.telefono,
  };
}

export function lookupFornitoreByPivaCfName(
  input: {
    partitaIva?: string;
    codiceFiscale?: string;
    ragioneSociale?: string;
    indirizzo?: string;
    telefono?: string;
  },
  mag: MagazzinoMasterPrefs,
  aiConfidence = 0.5,
): FornitoreMatchResult {
  const index = buildAnagraficaIndex(mag);
  const labels = index.map((e) => e.label);
  const piva = normPiva(input.partitaIva ?? "");
  const cf = normCf(input.codiceFiscale ?? "");
  const nome = input.ragioneSociale?.trim() ?? "";

  if (piva.length === 11) {
    for (const entry of index) {
      if (normPiva(entry.anag.partitaIva) === piva) {
        return {
          matched: true,
          label: entry.label,
          matchMethod: "piva",
          confidence: Math.max(aiConfidence, 0.9),
        };
      }
    }
  }

  const cfCandidates = [cf, piva.length === 11 ? piva : ""].filter(Boolean);
  for (const cfKey of cfCandidates) {
    for (const entry of index) {
      const entryCf = normCf(entry.anag.codiceFiscale);
      const entryPiva = normPiva(entry.anag.partitaIva);
      if ((entryCf && entryCf === cfKey) || (entryPiva && entryPiva === cfKey && cfKey.length === 11)) {
        return {
          matched: true,
          label: entry.label,
          matchMethod: "cf",
          confidence: Math.max(aiConfidence, 0.88),
        };
      }
    }
  }

  if (nome) {
    const exactLabel = findExactEntityInPool(nome, labels, { standardizeLegalSuffix: true });
    if (exactLabel) {
      return {
        matched: true,
        label: exactLabel,
        matchMethod: "exact",
        confidence: Math.max(aiConfidence, 0.85),
      };
    }

    for (const entry of index) {
      const rs = entry.anag.ragioneSociale.trim();
      if (rs && findExactEntityInPool(nome, [rs], { standardizeLegalSuffix: true })) {
        return {
          matched: true,
          label: entry.label,
          matchMethod: "exact",
          confidence: Math.max(aiConfidence, 0.85),
        };
      }
    }

    const normNome = normalizeEntityString(nome, { standardizeLegalSuffix: true });
    for (const entry of index) {
      const keys = [
        normalizeEntityString(entry.label, { standardizeLegalSuffix: true }),
        normalizeEntityString(entry.anag.ragioneSociale, { standardizeLegalSuffix: true }),
      ].filter(Boolean);
      if (keys.some((k) => k === normNome)) {
        return {
          matched: true,
          label: entry.label,
          matchMethod: "normalized",
          confidence: Math.max(aiConfidence, 0.82),
        };
      }
    }

    const fuzzy = findSimilarSettingsDuplicate(labels, nome);
    if (fuzzy) {
      return {
        matched: true,
        label: fuzzy,
        matchMethod: "fuzzy",
        matchScore: 0.75,
        confidence: Math.max(aiConfidence, 0.7),
      };
    }
  }

  const fallbackLabel = nome || "Fornitore";
  return {
    matched: false,
    label: fallbackLabel,
    matchMethod: "none",
    confidence: aiConfidence,
    snapshotProposal: snapshotFromExtracted(fallbackLabel, {
      ragioneSociale: nome,
      partitaIva: input.partitaIva,
      codiceFiscale: input.codiceFiscale,
      indirizzo: input.indirizzo,
      telefono: input.telefono,
    }),
  };
}

export function fornitoreAnagraficaKey(label: string): string {
  return normFornitoreAlternativoKey(label);
}
