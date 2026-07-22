"use client";

import { withPageWriteGuard } from "@/lib/domain/with-page-write-guard";
import { maintenanceEngineV2Service } from "@/src/services/maintenance-engine-v2.service";
import { maintenancePlansService } from "@/src/services/maintenance-plans.service";

export const maintenancePlansEntry = {
  listTipoCatalog: maintenancePlansService.listTipoCatalog.bind(maintenancePlansService),
  listPlans: maintenancePlansService.listPlans.bind(maintenancePlansService),
  listMezzoPlanStatuses: maintenancePlansService.listMezzoPlanStatuses.bind(maintenancePlansService),
  listServicesByMezzo: maintenancePlansService.listServicesByMezzo.bind(maintenancePlansService),
  searchRicambiForPlan: maintenancePlansService.searchRicambiForPlan.bind(maintenancePlansService),
  listPresetSummaries: maintenancePlansService.listPresetSummaries.bind(maintenancePlansService),
  ensureCatalogLabels: withPageWriteGuard("mezzi", maintenancePlansService.ensureCatalogLabels.bind(maintenancePlansService)),
  upsertPlan: withPageWriteGuard("mezzi", maintenancePlansService.upsertPlan.bind(maintenancePlansService)),
  softDeletePlan: withPageWriteGuard("mezzi", maintenancePlansService.softDeletePlan.bind(maintenancePlansService)),
  registerService: withPageWriteGuard("mezzi", maintenancePlansService.registerService.bind(maintenancePlansService)),
  listServicesLite: maintenancePlansService.listServicesLite.bind(maintenancePlansService),
  deleteService: withPageWriteGuard("mezzi", maintenancePlansService.deleteService.bind(maintenancePlansService)),
  toggleMatrixMilestone: withPageWriteGuard("mezzi", maintenancePlansService.toggleMatrixMilestone.bind(maintenancePlansService)),
  // v2 engine
  listMezzoConfigs: maintenanceEngineV2Service.listMezzoConfigs.bind(maintenanceEngineV2Service),
  loadEffectivePresetForConfig: maintenanceEngineV2Service.loadEffectivePresetForConfig.bind(maintenanceEngineV2Service),
  upsertMezzoConfig: withPageWriteGuard("mezzi", maintenanceEngineV2Service.upsertMezzoConfig.bind(maintenanceEngineV2Service)),
  softDeleteMezzoConfig: withPageWriteGuard("mezzi", maintenanceEngineV2Service.softDeleteMezzoConfig.bind(maintenanceEngineV2Service)),
  registerExecutionV2: withPageWriteGuard("mezzi", maintenanceEngineV2Service.registerExecutionV2.bind(maintenanceEngineV2Service)),
  listTagliandiOverview: maintenanceEngineV2Service.listTagliandiOverview.bind(maintenanceEngineV2Service),
  recomputeForecast: withPageWriteGuard("mezzi", maintenanceEngineV2Service.recomputeForecast.bind(maintenanceEngineV2Service)),
  listPresetHierarchy: maintenanceEngineV2Service.listPresetHierarchy.bind(maintenanceEngineV2Service),
  bulkAssignPresetToMezzi: withPageWriteGuard(
    "mezzi",
    maintenanceEngineV2Service.bulkAssignPresetToMezzi.bind(maintenanceEngineV2Service),
  ),
  listMezziWithoutPreset: maintenanceEngineV2Service.listMezziWithoutPreset.bind(maintenanceEngineV2Service),
};
