"use client";

import { useEffect, useState } from "react";
import { FormSection } from "@/components/gestionale/schede/gestionale-form-section";
import { dsBtnNeutralForm } from "@/lib/ui/design-system";

type VatCodeRow = { id: string; code: string; active: boolean };
type VatConfigRow = {
  id: string;
  vat_code_id: string;
  description: string;
  rate: number;
  direction: string;
  valid_from: string;
  valid_to: string | null;
  active: boolean;
};

/** Admin minima codici IVA — versionamento via API (non modifica distruttiva). */
export function VatCodesAdminSection() {
  const [codes, setCodes] = useState<VatCodeRow[]>([]);
  const [configs, setConfigs] = useState<VatConfigRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = () => {
    void fetch("/api/admin/vat-codes")
      .then((r) => r.json())
      .then((body: { codes?: VatCodeRow[]; configurations?: VatConfigRow[]; error?: string }) => {
        if (body.error) throw new Error(body.error);
        setCodes(body.codes ?? []);
        setConfigs(body.configurations ?? []);
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Errore"));
  };

  useEffect(() => {
    reload();
  }, []);

  return (
    <FormSection
      title="Codici IVA"
      action={
        <button type="button" className={dsBtnNeutralForm} onClick={reload}>
          Aggiorna
        </button>
      }
    >
      <p className="mb-3 text-[10px] text-[color:var(--cab-text-muted)]">
        Default commerciale su clienti/fornitori ≠ verità fiscale: il server risolve e valida sempre per data e direzione.
        Modifica configurazione usata → nuova versione temporale (non UPDATE storico).
      </p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase text-[color:var(--cab-text-muted)]">
              <th className="py-1 pr-2">Codice</th>
              <th className="py-1 pr-2">Descrizione</th>
              <th className="py-1 pr-2">Direction</th>
              <th className="py-1 pr-2">Rate</th>
              <th className="py-1 pr-2">Validità</th>
            </tr>
          </thead>
          <tbody>
            {configs.map((c) => {
              const code = codes.find((x) => x.id === c.vat_code_id);
              return (
                <tr key={c.id} className="border-t border-[color:var(--cab-border)]">
                  <td className="py-2 pr-2 font-mono">{code?.code ?? "—"}</td>
                  <td className="py-2 pr-2">{c.description}</td>
                  <td className="py-2 pr-2">{c.direction}</td>
                  <td className="py-2 pr-2">{c.rate}%</td>
                  <td className="py-2 pr-2">
                    {c.valid_from} → {c.valid_to ?? "∞"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </FormSection>
  );
}
