import "server-only";

import { readRuntimeSecret } from "@/lib/ai/runtime/env-reader";

export function isSparePartsMockMode(): boolean {
  const raw = readRuntimeSecret("AI_SPARE_PARTS_MOCK")?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export type MockWebHit = {
  title: string;
  url: string;
  excerpt: string;
  candidatePartNumber: string | null;
};

/** Deterministic mock web hits for tests and offline dev. */
export function mockWebSearchHits(query: string): MockWebHit[] {
  const q = query.toLowerCase();
  if (!q.trim()) return [];
  return [
    {
      title: `Web result — ${query.slice(0, 40)}`,
      url: "https://example.com/parts/mock",
      excerpt: "Candidato web non verificato (mock).",
      candidatePartNumber: q.includes("spring") ? "MOCK-GAS-SPRING" : null,
    },
  ];
}

export function mockVisualAnalysis(input: {
  description: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  manufacturer?: string;
}) {
  return {
    normalizedDescription: input.description,
    manufacturer: input.manufacturer,
    visibleCodes: [] as string[],
    visualFeatures: [] as string[],
    vehicleBrand: input.vehicleBrand,
    vehicleModel: input.vehicleModel,
  };
}
