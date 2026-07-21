"use client";

import dynamic from "next/dynamic";
import { GlobalAnchoredMenuItems, Tooltip } from "@/components/ui";
import { useCallback, useId, useRef, useState } from "react";
import { HubIconUpload } from "@/components/design-system/hub-table-action-icons";

import type { ImportEntity } from "@/lib/data-import/core/types";
import { canImportEntity, isImportEntityStub } from "@/lib/data-import/core/import-permissions";
import { labelForImportEntity } from "@/lib/data-import/import-registry-client";
import { dsPageToolbarIconBtn } from "@/lib/ui/design-system";
import { useDropdownFocusRestore } from "@/lib/ui/use-dropdown-focus-restore";
import { usePermissions } from "@/src/hooks/use-permissions";

const DataImportWizardModal = dynamic(
  () => import("@/components/data-import/data-import-wizard-modal").then((m) => m.DataImportWizardModal),
  { ssr: false },
);

const MAGAZZINO_IMPORT_ENTITIES = ["magazzino_ricambi", "listino_ricambi"] as const satisfies readonly ImportEntity[];

type MagazzinoImportEntity = (typeof MAGAZZINO_IMPORT_ENTITIES)[number];

export function MagazzinoImportMenu({
  disabled,
  onCompleted,
}: {
  disabled?: boolean;
  onCompleted?: () => void;
}) {
  const menuId = useId();
  const shellRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [wizardEntity, setWizardEntity] = useState<MagazzinoImportEntity | null>(null);
  const perm = usePermissions("magazzino");
  const permissionCtx = {
    magazzinoWrite: perm.canWrite,
    magazzinoAdmin: perm.canWrite,
    manageSettings: false,
    moduleWrite: { magazzino: perm.canWrite },
  };

  const entries = MAGAZZINO_IMPORT_ENTITIES.filter(
    (entity) => canImportEntity(permissionCtx, entity) && !isImportEntityStub(entity),
  );

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useDropdownFocusRestore(menuOpen);

  if (entries.length === 0) return null;

  const inactive = Boolean(disabled);

  const openWizard = (entity: MagazzinoImportEntity) => {
    closeMenu();
    setWizardEntity(entity);
  };

  return (
    <>
      <div ref={shellRef} className="relative shrink-0">
        <Tooltip content={inactive ? "Sola lettura" : "Importa"}>
          <button
            type="button"
            className={`${dsPageToolbarIconBtn} shrink-0`}
            disabled={inactive}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-controls={menuId}
            aria-label="Importa"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <HubIconUpload className="h-4 w-4" />
            <span className="sr-only">Importa</span>
          </button>
        </Tooltip>
        <GlobalAnchoredMenuItems
          open={menuOpen}
          anchorRef={shellRef}
          onClose={closeMenu}
          listId={menuId}
          aria-label="Opzioni importazione"
          placement="bottom-end"
          matchAnchorWidth={false}
          items={entries.map((entity) => ({
            id: entity,
            label: entity === "listino_ricambi" ? "Importa listino" : "Importa magazzino",
          }))}
          onSelect={(item) => openWizard(item.id as MagazzinoImportEntity)}
        />
      </div>
      {wizardEntity ? (
        <DataImportWizardModal
          entity={wizardEntity}
          title={`Importa — ${labelForImportEntity(wizardEntity)}`}
          onRequestClose={() => setWizardEntity(null)}
          onCompleted={() => {
            onCompleted?.();
            setWizardEntity(null);
          }}
        />
      ) : null}
    </>
  );
}

/** @deprecated Usare `MagazzinoImportMenu`. */
export const MagazzinoImportEntry = MagazzinoImportMenu;
