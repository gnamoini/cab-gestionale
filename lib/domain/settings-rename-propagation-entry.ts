"use client";

import { withPageWriteGuard } from "@/lib/domain/with-page-write-guard";
import { settingsRenamePropagationService } from "@/src/services/settings-rename-propagation.service";

export const settingsRenamePropagationEntry = {
  propagateRenames: withPageWriteGuard(
    "impostazioni",
    settingsRenamePropagationService.propagateRenames.bind(settingsRenamePropagationService),
  ),
};
