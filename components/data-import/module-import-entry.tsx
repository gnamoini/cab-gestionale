"use client";

import { DataImportEntry } from "@/components/data-import/data-import-entry";
import type { ImportEntity } from "@/lib/data-import/core/types";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import { usePermissions } from "@/src/hooks/use-permissions";

export function ModuleImportEntry({
  entity,
  module,
  buttonLabel = "Importa",
  className = "",
  
}: {
  entity: ImportEntity;
  module: GestionalePermissionModule;
  buttonLabel?: string;
  className?: string;
  onCompleted?: () => void;
}) {
  const perm = usePermissions(module);
  return (
    <DataImportEntry
      entity={entity}
      buttonLabel={buttonLabel}
      className={className}
      permissionCtx={{
        magazzinoWrite: module === "magazzino" && perm.canWrite,
        magazzinoAdmin: false,
        manageSettings: false,
        moduleWrite: { [module]: perm.canWrite },
      }}
    />
  );
}
