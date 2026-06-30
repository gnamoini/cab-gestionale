"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { dsBtnNeutralForm } from "@/lib/ui/design-system";

const DataImportWizardModal = dynamic(
  () => import("@/components/data-import/data-import-wizard-modal").then((m) => m.DataImportWizardModal),
  { ssr: false },
);

export function ClientiImportEntry({ disabled }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={dsBtnNeutralForm} disabled={disabled} onClick={() => setOpen(true)}>
        Importa anagrafiche
      </button>
      {open ? (
        <DataImportWizardModal
          entity="clienti_anagrafica"
          title="Importa anagrafiche clienti"
          onRequestClose={() => setOpen(false)}
          onCompleted={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
