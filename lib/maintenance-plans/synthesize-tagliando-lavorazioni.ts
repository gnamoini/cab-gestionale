import { STATO_LAVORAZIONE_COMPLETATA_ID } from "@/lib/lavorazioni/stati-dynamic";
import type { MaintenanceServiceHistoryView } from "@/lib/maintenance-plans/types";

export type TagliandoLavorazioneCandidate = {
  id: string;
  stato: string;
  archived: boolean | null;
  data_uscita: string | null;
  data_ingresso: string | null;
  tagliando_preset_ref: string | null;
};

export type IngressoSchedaForLavorazione = {
  lavorazioneId: string;
  oreLavoro: number;
  km: number | null;
};

export function parseIngressoMeterFromSchedaContenuto(contenuto: unknown): { ore: number; km: number | null } {
  const root = contenuto as Record<string, unknown> | null | undefined;
  const campi = (root?.doc as Record<string, unknown> | undefined)?.campi as
    | Record<string, unknown>
    | undefined;
  const ore = Number(campi?.oreLavoro ?? 0);
  const kmRaw = Number(campi?.km ?? 0);
  return { ore, km: kmRaw > 0 ? kmRaw : null };
}

function resolveSyntheticPlanId(
  lav: TagliandoLavorazioneCandidate,
  activePresetIds: readonly string[],
): string {
  const presetRef = lav.tagliando_preset_ref?.trim() ?? "";
  if (presetRef && activePresetIds.includes(presetRef)) return presetRef;
  if (activePresetIds.length === 1) return activePresetIds[0]!;
  return presetRef;
}

function isTagliandoLavorazioneClosed(lav: TagliandoLavorazioneCandidate): boolean {
  if (lav.archived === true) return true;
  return lav.stato === STATO_LAVORAZIONE_COMPLETATA_ID;
}

/** ponytail: O(n·m) scan; upgrade path = join SQL se diventa hot path */
export function buildSyntheticTagliandoHistoryViews(input: {
  lavorazioni: readonly TagliandoLavorazioneCandidate[];
  ingressiByLavorazioneId: ReadonlyMap<string, IngressoSchedaForLavorazione>;
  registeredLavorazioneIds: ReadonlySet<string>;
  activePresetIds: readonly string[];
  planNames: ReadonlyMap<string, string>;
}): MaintenanceServiceHistoryView[] {
  const out: MaintenanceServiceHistoryView[] = [];

  for (const lav of input.lavorazioni) {
    if (!isTagliandoLavorazioneClosed(lav)) continue;
    if (input.registeredLavorazioneIds.has(lav.id)) continue;

    const ingresso = input.ingressiByLavorazioneId.get(lav.id);
    const oreAtService = ingresso?.oreLavoro ?? 0;
    const kmAtService = ingresso?.km ?? null;
    if (oreAtService <= 0 && (kmAtService == null || kmAtService <= 0)) continue;

    const planId = resolveSyntheticPlanId(lav, input.activePresetIds);
    if (!planId) continue;

    const performedAt =
      lav.data_uscita?.slice(0, 10) ?? lav.data_ingresso?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);

    const milestoneOre = kmAtService != null && kmAtService > 0 ? kmAtService : oreAtService;

    out.push({
      id: `synthetic:${lav.id}`,
      planId,
      planNome: input.planNames.get(planId) ?? "—",
      performedAt,
      oreAtService: milestoneOre,
      kmAtService,
      mezzoOreSnapshot: oreAtService > 0 ? oreAtService : null,
      note: "",
      performedByName: "—",
      executionType: "scheduled",
      presetSnapshot: null,
      lavorazioneId: lav.id,
      synthetic: true,
      complianceAuto: null,
      complianceReview: null,
      versionLabel: null,
      parts: [],
      checklist: [],
    });
  }

  return out;
}
