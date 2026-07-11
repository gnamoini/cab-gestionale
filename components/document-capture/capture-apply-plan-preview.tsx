"use client";

import type { CaptureApplyPlan } from "@/lib/document-capture/capture-apply-plan";
import type { SchedaIngressoFields } from "@/types/schede";

function ingressoRows(campi: SchedaIngressoFields): Array<[string, string]> {
  return [
    ["Data ingresso", campi.dataIngresso],
    ["Cliente", campi.cliente],
    ["Cantiere", campi.cantiere],
    ["Utilizzatore", campi.utilizzatore],
    ["Attrezzatura", [campi.marcaAttrezzatura, campi.modelloAttrezzatura, campi.matricola].filter(Boolean).join(" ")],
    ["N. scuderia", campi.nScuderia],
    ["Ore", campi.oreLavoro],
    ["Telaio", [campi.marcaTelaio, campi.modelloTelaio].filter(Boolean).join(" ")],
    ["Targa", campi.targa],
    ["Km", campi.km],
    ["Anomalia", campi.descrizioneAnomalia],
    ["Note", campi.noteIntervento],
  ].filter(([, value]) => value.trim().length > 0);
}

export function CaptureApplyPlanPreview({ plan }: { plan: CaptureApplyPlan | null }) {
  if (!plan?.bundlePreview?.ingresso) {
    return (
      <p className="text-sm text-[color:var(--cab-muted-fg)]">
        Anteprima lavorazione non disponibile. Torna indietro e ripeti il controllo dati.
      </p>
    );
  }

  const ingresso = plan.bundlePreview.ingresso.campi;
  const rows = ingressoRows(ingresso);
  const lavRows = plan.bundlePreview.lavorazioni?.campi.righe.length ?? 0;
  const ricRows = plan.bundlePreview.ricambi?.campi.righe.length ?? 0;

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium">Anteprima lavorazione</h3>
      <p className="text-xs text-[color:var(--cab-muted-fg)]">
        Verrà creata una nuova lavorazione con scheda ingresso
        {plan.creates.lavorazioniScheda && lavRows > 0 ? `, ${lavRows} righe lavorazioni` : ""}
        {plan.creates.ricambiScheda && ricRows > 0 ? `, ${ricRows} righe ricambi` : ""}.
      </p>
      <dl className="grid gap-2 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] p-3 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-0.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-3">
            <dt className="text-[color:var(--cab-muted-fg)]">{label}</dt>
            <dd className="min-w-0 break-words font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
