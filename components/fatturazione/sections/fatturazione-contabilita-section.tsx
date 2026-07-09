"use client";

import { useEffect, useState } from "react";
import { ShellCard } from "@/components/gestionale/shell-card";
import { downloadAccountingCsv } from "@/lib/fatturazione/accounting-export";
import { ACCOUNTING_ENTRIES_COLUMNS } from "@/lib/db/table-select-columns";
import { dsPageToolbarBtn, dsTypoSectionTitle, dsTypoSmall } from "@/lib/ui/design-system";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import type { AccountingEntryRow } from "@/src/types/supabase-tables";

export function FatturazioneContabilitaSection() {
  const [entries, setEntries] = useState<AccountingEntryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const c = getBrowserSupabase();
      const { data } = await c.from("accounting_entries").select(ACCOUNTING_ENTRIES_COLUMNS).order("entry_date", { ascending: false });
      setEntries((data ?? []) as AccountingEntryRow[]);
      setLoading(false);
    })();
  }, []);

  return (
    <ShellCard>
      <h2 className={dsTypoSectionTitle}>Contabilità clienti</h2>
      <p className={`${dsTypoSmall} mt-1`}>
        Prima nota e export commercialista. {loading ? "Caricamento…" : `${entries.length} scritture.`}
      </p>
      <button
        type="button"
        className={`${dsPageToolbarBtn} mt-4`}
        disabled={loading || entries.length === 0}
        onClick={() => downloadAccountingCsv(entries)}
      >
        Esporta CSV commercialista
      </button>
    </ShellCard>
  );
}
