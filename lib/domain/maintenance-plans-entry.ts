"use client";

import { withPageWriteGuard } from "@/lib/domain/with-page-write-guard";
import { maintenancePlansService } from "@/src/services/maintenance-plans.service";

export const maintenancePlansEntry = {
  listTipoCatalog: maintenancePlansService.listTipoCatalog.bind(maintenancePlansService),
  listPlans: maintenancePlansService.listPlans.bind(maintenancePlansService),
  listMezzoPlanStatuses: maintenancePlansService.listMezzoPlanStatuses.bind(maintenancePlansService),
  listServicesByMezzo: maintenancePlansService.listServicesByMezzo.bind(maintenancePlansService),
  searchRicambiForPlan: maintenancePlansService.searchRicambiForPlan.bind(maintenancePlansService),
  ensureCatalogLabels: withPageWriteGuard("impostazioni", maintenancePlansService.ensureCatalogLabels.bind(maintenancePlansService)),
  upsertPlan: withPageWriteGuard("impostazioni", maintenancePlansService.upsertPlan.bind(maintenancePlansService)),
  softDeletePlan: withPageWriteGuard("impostazioni", maintenancePlansService.softDeletePlan.bind(maintenancePlansService)),
  registerService: withPageWriteGuard("mezzi", maintenancePlansService.registerService.bind(maintenancePlansService)),
};
