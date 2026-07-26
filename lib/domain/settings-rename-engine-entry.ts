"use client";

import { withPageWriteGuard } from "@/lib/domain/with-page-write-guard";
import { settingsRenameEngineService } from "@/src/services/settings-rename-engine.service";
import { settingsRenameJobService } from "@/src/services/settings-rename-job.service";
import { settingsRenamePropagationService } from "@/src/services/settings-rename-propagation.service";

export const settingsRenameEngineEntry = {
  buildRenamePlan: settingsRenameEngineService.buildRenamePlan,
  previewRename: withPageWriteGuard("impostazioni", settingsRenameEngineService.previewRename.bind(settingsRenameEngineService)),
  runRenameJob: withPageWriteGuard("impostazioni", settingsRenameEngineService.runRenameJob.bind(settingsRenameEngineService)),
  getJob: withPageWriteGuard("impostazioni", settingsRenameJobService.getJob.bind(settingsRenameJobService)),
  propagateRenames: withPageWriteGuard(
    "impostazioni",
    settingsRenamePropagationService.propagateRenames.bind(settingsRenamePropagationService),
  ),
};
