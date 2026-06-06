"use client";

import { createPortal } from "react-dom";
import { Button } from "@/components/design-system";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import type { PromemoriaRecurrenceScope } from "@/lib/dashboard/dashboard-promemoria-recurrence";
import { dsModalFormFooter, dsTypoSmall } from "@/lib/ui/design-system";

export function DashboardPromemoriaScopeDialog({
  open,
  mode,
  title,
  onClose,
  onSelect,
}: {
  open: boolean;
  mode: "edit" | "delete";
  title: string;
  onClose: () => void;
  onSelect: (scope: PromemoriaRecurrenceScope) => void;
}) {
  if (!open || typeof document === "undefined") return null;

  const verb = mode === "delete" ? "Eliminare" : "Applicare le modifiche a";

  return createPortal(
    <GestionaleModalShell
      onRequestClose={onClose}
      title={mode === "delete" ? "Elimina promemoria ricorrente" : "Modifica promemoria ricorrente"}
      titleId="dashboard-promemoria-scope-title"
      dialogSize="compact"
    >
      <div className="space-y-4 p-4">
        <p className={`${dsTypoSmall} text-[color:var(--cab-text)]`}>
          «{title}» fa parte di una serie ricorrente. {verb}:
        </p>
        <div className="flex min-w-0 flex-col gap-2">
          <Button type="button" variant="secondary" className="w-full justify-start" onClick={() => onSelect("single")}>
            Solo questa occorrenza
          </Button>
          <Button type="button" variant="secondary" className="w-full justify-start" onClick={() => onSelect("following")}>
            Questa e le successive
          </Button>
          <Button
            type="button"
            variant={mode === "delete" ? "danger" : "secondary"}
            className="w-full justify-start"
            onClick={() => onSelect("series")}
          >
            Tutta la serie
          </Button>
        </div>
      </div>
      <footer className={dsModalFormFooter}>
        <Button type="button" variant="ghost" onClick={onClose}>
          Annulla
        </Button>
      </footer>
    </GestionaleModalShell>,
    document.body,
  );
}
