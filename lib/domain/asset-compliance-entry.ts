"use client";

import { withPageWriteGuard } from "@/lib/domain/with-page-write-guard";
import { assetComplianceService } from "@/src/services/asset-compliance.service";

export const assetComplianceEntry = {
  listRulesByMezzo: assetComplianceService.listRulesByMezzo.bind(assetComplianceService),
  listRulesByAttrezzatura: assetComplianceService.listRulesByAttrezzatura.bind(assetComplianceService),
  listUpcomingRules: assetComplianceService.listUpcomingRules.bind(assetComplianceService),
  listRecordsByMezzo: assetComplianceService.listRecordsByMezzo.bind(assetComplianceService),
  createRule: withPageWriteGuard("mezzi", assetComplianceService.createRule.bind(assetComplianceService)),
  updateRule: withPageWriteGuard("mezzi", assetComplianceService.updateRule.bind(assetComplianceService)),
  createRecord: withPageWriteGuard("mezzi", assetComplianceService.createRecord.bind(assetComplianceService)),
};
