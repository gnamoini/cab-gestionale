"use client";

import { Drawer } from "@/components/design-system";
import {
  GestionaleLogEmpty,
  GestionaleLogEntryFourLines,
  GestionaleLogList,
  gestionaleLogDrawerPanelClass,
  gestionaleLogScrollEmbeddedClass,
} from "@/components/gestionale/gestionale-log-ui";
import type { GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";

export function FatturazioneLogDrawer({
  open,
  onClose,
  entries,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  entries: readonly { id: string; vm: GestionaleLogViewModel }[];
  isLoading: boolean;
}) {
  if (!open) return null;

  return (
    <Drawer open={open} onClose={onClose} title="Log fatturazione" ariaLabel="Log fatturazione">
      <div className={gestionaleLogDrawerPanelClass}>
        <div className={gestionaleLogScrollEmbeddedClass}>
          {isLoading ? (
            <p className="p-4 text-sm text-[color:var(--cab-text-muted)]">Caricamento…</p>
          ) : entries.length === 0 ? (
            <GestionaleLogEmpty message="Nessuna voce di log." />
          ) : (
            <GestionaleLogList>
              {entries.map((entry) => (
                <li key={entry.id} className="list-none">
                  <GestionaleLogEntryFourLines vm={entry.vm} />
                </li>
              ))}
            </GestionaleLogList>
          )}
        </div>
      </div>
    </Drawer>
  );
}
