import type { MaintenancePlanStatus } from "@/lib/maintenance-plans/types";

export type ServiceOreRow = { planId: string; oreAtService: number };

export function computePlanStatus(input: {
  planId: string;
  planNome: string;
  intervalOre: number;
  services: ServiceOreRow[];
  currentOreMezzo: number;
}): MaintenancePlanStatus {
  const forPlan = input.services.filter((s) => s.planId === input.planId);
  const ultimoOre =
    forPlan.length > 0 ? Math.max(...forPlan.map((s) => s.oreAtService)) : null;
  const prossimoOre =
    ultimoOre != null ? ultimoOre + input.intervalOre : input.intervalOre;
  const oreMancanti = prossimoOre - input.currentOreMezzo;

  return {
    planId: input.planId,
    planNome: input.planNome,
    intervalOre: input.intervalOre,
    ultimoOre,
    prossimoOre,
    oreMancanti,
  };
}

export function computeAllPlanStatuses(input: {
  plans: { id: string; nome: string; intervalOre: number }[];
  services: ServiceOreRow[];
  currentOreMezzo: number;
}): MaintenancePlanStatus[] {
  return input.plans.map((plan) =>
    computePlanStatus({
      planId: plan.id,
      planNome: plan.nome,
      intervalOre: plan.intervalOre,
      services: input.services,
      currentOreMezzo: input.currentOreMezzo,
    }),
  );
}
