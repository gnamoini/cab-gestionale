"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { dsPageToolbarBtn } from "@/lib/ui/design-system";

const DataImportWizardModal = dynamic(
  () => import("@/components/data-import/data-import-wizard-modal").then((m) => m.DataImportWizardModal),
  { ssr: false },
);

export function MagazzinoImportEntry({ disabled, onCompleted }: { disabled?: boolean; onCompleted?: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={dsPageToolbarBtn} disabled={disabled} onClick={() => setOpen(true)}>
        Importa
      </button>
      {open ? (
        <DataImportWizardModal
          entity="magazzino_ricambi"
          title="Importa magazzino"
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
