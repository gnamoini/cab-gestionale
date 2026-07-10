"use client";

import type { ComponentType } from "react";
import type { ReportSectionId } from "@/components/report/report-sections-config";
import type { DomainReportSectionProps, ReportAiSectionProps } from "@/components/report/report-section-types";

export type ReportSectionLoaderResult =
  | { status: "loaded"; component: ComponentType<DomainReportSectionProps | ReportAiSectionProps> }
  | { status: "error"; error: unknown; retry: () => void };

type AnySectionComponent = ComponentType<DomainReportSectionProps | ReportAiSectionProps>;

const loaderCache = new Map<ReportSectionId, Promise<ReportSectionLoaderResult>>();

export async function loadReportSection(id: ReportSectionId): Promise<ReportSectionLoaderResult> {
  const cached = loaderCache.get(id);
  if (cached) return cached;

  const promise = (async (): Promise<ReportSectionLoaderResult> => {
    try {
      switch (id) {
        case "analisi_ai": {
          const mod = await import("@/components/report/sections/report-ai-section");
          return { status: "loaded", component: mod.default as AnySectionComponent };
        }
        case "lavorazioni": {
          const mod = await import("@/components/report/sections/report-lavorazioni-section");
          return { status: "loaded", component: mod.default as AnySectionComponent };
        }
        case "clienti_mezzi": {
          const mod = await import("@/components/report/sections/report-clienti-mezzi-section");
          return { status: "loaded", component: mod.default as AnySectionComponent };
        }
        case "magazzino_ricambi": {
          const mod = await import("@/components/report/sections/report-magazzino-section");
          return { status: "loaded", component: mod.default as AnySectionComponent };
        }
        case "ore_lavorate": {
          const mod = await import("@/components/report/sections/report-ore-section");
          return { status: "loaded", component: mod.default as AnySectionComponent };
        }
        case "dati_economici": {
          const mod = await import("@/components/report/sections/report-economici-section");
          return { status: "loaded", component: mod.default as AnySectionComponent };
        }
        case "analisi_incrociate": {
          const mod = await import("@/components/report/sections/report-cross-section");
          return { status: "loaded", component: mod.default as AnySectionComponent };
        }
        case "grafici_kpi": {
          const mod = await import("@/components/report/sections/report-kpi-charts-section");
          return { status: "loaded", component: mod.default as AnySectionComponent };
        }
        default:
          return { status: "error", error: new Error(`Unknown section ${id}`), retry: () => loaderCache.delete(id) };
      }
    } catch (error) {
      return {
        status: "error",
        error,
        retry: () => {
          loaderCache.delete(id);
        },
      };
    }
  })();

  loaderCache.set(id, promise);
  const result = await promise;
  if (result.status === "error") loaderCache.delete(id);
  return result;
}

export function clearReportSectionLoaderCache(id?: ReportSectionId): void {
  if (id) loaderCache.delete(id);
  else loaderCache.clear();
}
