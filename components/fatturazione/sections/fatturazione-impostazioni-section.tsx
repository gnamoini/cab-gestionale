"use client";

import { ShellCard } from "@/components/gestionale/shell-card";
import { dsTypoSectionTitle, dsTypoSmall } from "@/lib/ui/design-system";

export function FatturazioneImpostazioniSection({ canWrite }: { canWrite: boolean }) {
  return (
    <ShellCard>
      <h2 className={dsTypoSectionTitle}>Impostazioni fatturazione</h2>
      <p className={`${dsTypoSmall} mt-1`}>
        Numerazione per tipo/serie, workflow approvativo e permessi operativi (JSON in billing_settings).
      </p>
      {!canWrite ? (
        <p className={`${dsTypoSmall} mt-3 text-[color:var(--cab-text-muted)]`}>Solo lettura — servono permessi di scrittura.</p>
      ) : (
        <p className={`${dsTypoSmall} mt-3`}>Numerazione attiva: sequenze `invoice_number_sequences` predisposte in DB.</p>
      )}
    </ShellCard>
  );
}
