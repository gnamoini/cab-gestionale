import { registerHealthSection } from "@/lib/health-score/registry/section-registry";
import type { HealthSectionDefinition } from "@/lib/health-score/registry/types";

const SECTIONS: HealthSectionDefinition[] = [
  { id: "produzione", title: "Produzione", weight: 0.3, requiredModules: ["lavorazioni"] },
  { id: "magazzino", title: "Magazzino", weight: 0.2, requiredModules: ["magazzino"] },
  { id: "personale", title: "Personale", weight: 0.2, requiredModules: ["dipendenti"] },
  {
    id: "economico",
    title: "Economico",
    weight: 0.2,
    requiredModules: ["preventivi", "fatturazione"],
  },
  { id: "rischio", title: "Rischio operativo", weight: 0.1 },
];

export function registerDefaultHealthSections(): void {
  for (const s of SECTIONS) registerHealthSection(s);
}

export { SECTIONS };
