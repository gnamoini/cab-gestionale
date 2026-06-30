"use client";

import { DataImportEntry } from "@/components/data-import/data-import-entry";
import type { ImportEntity } from "@/lib/data-import/core/types";
import { usePermissions } from "@/src/hooks/use-permissions";

export function SettingsImportEntry({
  entity,
  buttonLabel = "Importa",
  className = "",
}: {
  entity: ImportEntity;
  buttonLabel?: string;
  className?: string;
}) {
  const global = usePermissions();
  return (
    <DataImportEntry
      entity={entity}
      buttonLabel={buttonLabel}
      className={className}
      permissionCtx={{
        magazzinoWrite: false,
        magazzinoAdmin: false,
        manageSettings: global.canManageSettings,
      }}
    />
  );
}
