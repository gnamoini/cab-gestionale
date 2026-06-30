"use client";

import { useState } from "react";
import { DataImportWizardModal } from "@/components/data-import/data-import-wizard-modal";
import { dsPageToolbarBtn } from "@/lib/ui/design-system";
import type { ImportEntity } from "@/lib/data-import/core/types";
import { labelForImportEntity } from "@/lib/data-import/import-registry-client";
import { canImportEntity, isImportEntityStub, type ImportPermissionContext } from "@/lib/data-import/core/import-permissions";

export function DataImportEntry({
  entity,
  permissionCtx,
  buttonLabel = "Importa",
  className = "",
  onCompleted,
}: {
  entity: ImportEntity;
  permissionCtx: ImportPermissionContext;
  buttonLabel?: string;
  className?: string;
  onCompleted?: () => void;
}) {
  const [open, setOpen] = useState(false);

  if (!canImportEntity(permissionCtx, entity) || isImportEntityStub(entity)) {
    return null;
  }

  return (
    <>
      <button type="button" className={`${dsPageToolbarBtn} shrink-0 ${className}`.trim()} onClick={() => setOpen(true)}>
        {buttonLabel}
      </button>
      {open ? (
        <DataImportWizardModal
          entity={entity}
          title={`Importa — ${labelForImportEntity(entity)}`}
          onRequestClose={() => setOpen(false)}
          onCompleted={() => {
            onCompleted?.();
            setOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
