"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { LoadingCardSkeleton } from "@/components/design-system";
import type { SistemaSectionId } from "@/components/dashboard/settings/settings-workspace-types";

function sectionLoading() {
  return <LoadingCardSkeleton minHeightClass="min-h-[280px]" rows={4} />;
}

export const SettingsLavorazioniModalLazy = dynamic(
  () =>
    import("@/components/gestionale/lavorazioni/lavorazioni-modals").then((m) => ({
      default: m.SettingsLavorazioniModal,
    })),
  { loading: sectionLoading },
);

export const HierarchyTreeSettingsSectionLazy = dynamic(
  () =>
    import("@/components/dashboard/hierarchy-tree-settings-section").then((m) => ({
      default: m.HierarchyTreeSettingsSection,
    })),
  { loading: sectionLoading },
);

export const SettingsBrandingSectionLazy = dynamic(
  () =>
    import("@/components/dashboard/settings-branding-section").then((m) => ({
      default: m.SettingsBrandingSection,
    })),
  { loading: sectionLoading },
);

export const SettingsEconomiciSectionLazy = dynamic(
  () =>
    import("@/components/dashboard/settings/settings-economici-section").then((m) => ({
      default: m.SettingsEconomiciSection,
    })),
  { loading: sectionLoading },
);

export const SettingsTkbAdminSectionLazy = dynamic(
  () =>
    import("@/components/dashboard/settings/settings-tkb-admin-section").then((m) => ({
      default: m.SettingsTkbAdminSection,
    })),
  { loading: sectionLoading },
);

export const SettingsMaintenancePlansSectionLazy = dynamic(
  () =>
    import("@/components/dashboard/settings/settings-maintenance-plans-section").then((m) => ({
      default: m.SettingsMaintenancePlansSection,
    })),
  { loading: sectionLoading },
);

export const SettingsEliminaConfirmDialogLazy = dynamic(() =>
  import("@/components/dashboard/settings-elimina-confirm-dialog").then((m) => ({
    default: m.SettingsEliminaConfirmDialog,
  })),
);

export const SettingsRinominaPropagaDialogLazy = dynamic(() =>
  import("@/components/dashboard/settings-rinomina-propaga-dialog").then((m) => ({
    default: m.SettingsRinominaPropagaDialog,
  })),
);

export const ConfigurazioneLogListEmbeddedLazy = dynamic(
  () =>
    import("@/components/configurazione/configurazione-log-section").then((m) => ({
      default: m.ConfigurazioneLogListEmbedded,
    })),
  { loading: sectionLoading },
);

export const SettingsOverviewSectionLazy = dynamic(
  () =>
    import("@/components/dashboard/settings/settings-overview-section").then((m) => ({
      default: m.SettingsOverviewSection,
    })),
  { loading: sectionLoading },
);

export const SettingsClientiCommercialiListLazy = dynamic(
  () =>
    import("@/components/dashboard/settings/settings-clienti-list").then((m) => ({
      default: m.SettingsClientiCommercialiList,
    })),
  { loading: sectionLoading },
);

export const SettingsMagazzinoMarcheListLazy = dynamic(
  () =>
    import("@/components/dashboard/settings/settings-magazzino-marche-list").then((m) => ({
      default: m.SettingsMagazzinoMarcheList,
    })),
  { loading: sectionLoading },
);

export const SettingsMagazzinoFornitoriListLazy = dynamic(
  () =>
    import("@/components/dashboard/settings/settings-magazzino-fornitori-list").then((m) => ({
      default: m.SettingsMagazzinoFornitoriList,
    })),
  { loading: sectionLoading },
);

export const SettingsDipendentiAssenzeSectionLazy = dynamic(
  () =>
    import("@/components/dashboard/settings-dipendenti-assenze-section").then((m) => ({
      default: m.SettingsDipendentiAssenzeSection,
    })),
  { loading: sectionLoading },
);

export const SettingsOfficinaProfiloSectionLazy = dynamic(
  () =>
    import("@/components/dashboard/settings/settings-officina-profilo-section").then((m) => ({
      default: m.SettingsOfficinaProfiloSection,
    })),
  { loading: sectionLoading },
);

export const SettingsUnifiedStringListLazy = dynamic(
  () =>
    import("@/components/dashboard/settings/settings-unified-string-list").then((m) => ({
      default: m.SettingsUnifiedStringList,
    })),
  { loading: sectionLoading },
);

export type SettingsSectionLoaderResult =
  | { status: "loaded"; component: ComponentType<unknown> }
  | { status: "error"; error: unknown; retry: () => void };

const loaderCache = new Map<SistemaSectionId, Promise<SettingsSectionLoaderResult>>();

const HEAVY_SECTION_IDS = new Set<SistemaSectionId>([
  "sys-panoramica",
  "op-addetti",
  "op-dipendenti-assenze",
  "op-stati",
  "op-priorita",
  "mag-marche",
  "mag-fornitori",
  "cli-cliente",
  "cli-cantiere",
  "cli-utilizzatore",
  "sys-tkb-kb",
  "sys-officina-profilo",
  "att-piani-tagliando",
  "att-marca",
  "att-modello",
  "tel-marca",
  "tel-modello",
  "brand-personalizzazione",
  "sys-economici",
]);

export function isHeavySettingsSection(id: SistemaSectionId): boolean {
  return HEAVY_SECTION_IDS.has(id);
}

export async function loadSettingsSection(id: SistemaSectionId): Promise<SettingsSectionLoaderResult> {
  const cached = loaderCache.get(id);
  if (cached) return cached;

  const promise = (async (): Promise<SettingsSectionLoaderResult> => {
    try {
      switch (id) {
        case "op-addetti":
        case "op-stati":
        case "op-priorita": {
          const mod = await import("@/components/gestionale/lavorazioni/lavorazioni-modals");
          return { status: "loaded", component: mod.SettingsLavorazioniModal as ComponentType<unknown> };
        }
        case "sys-tkb-kb": {
          const mod = await import("@/components/dashboard/settings/settings-tkb-admin-section");
          return { status: "loaded", component: mod.SettingsTkbAdminSection as ComponentType<unknown> };
        }
        case "att-piani-tagliando": {
          const mod = await import("@/components/dashboard/settings/settings-maintenance-plans-section");
          return { status: "loaded", component: mod.SettingsMaintenancePlansSection as ComponentType<unknown> };
        }
        case "att-marca":
        case "att-modello":
        case "tel-marca":
        case "tel-modello": {
          const mod = await import("@/components/dashboard/hierarchy-tree-settings-section");
          return { status: "loaded", component: mod.HierarchyTreeSettingsSection as ComponentType<unknown> };
        }
        case "brand-personalizzazione": {
          const mod = await import("@/components/dashboard/settings-branding-section");
          return { status: "loaded", component: mod.SettingsBrandingSection as ComponentType<unknown> };
        }
        case "sys-economici": {
          const mod = await import("@/components/dashboard/settings/settings-economici-section");
          return { status: "loaded", component: mod.SettingsEconomiciSection as ComponentType<unknown> };
        }
        default:
          return {
            status: "error",
            error: new Error(`Unknown or light section ${id}`),
            retry: () => loaderCache.delete(id),
          };
      }
    } catch (error) {
      return {
        status: "error",
        error,
        retry: () => loaderCache.delete(id),
      };
    }
  })();

  loaderCache.set(id, promise);
  const result = await promise;
  if (result.status === "error") loaderCache.delete(id);
  return result;
}
