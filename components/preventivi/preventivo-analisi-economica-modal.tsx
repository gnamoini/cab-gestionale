"use client";

import { useQuery } from "@tanstack/react-query";
import {
  GestionaleListTable,
  GestionaleListTableRow,
  GlobalTableHeadLabel,
} from "@/components/gestionale/global-table";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { LavorazioneReadOnlyPill } from "@/components/gestionale/lavorazioni/lavorazioni-inline-select";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { LoadingSpinner } from "@/components/design-system/loading";
import {
  preventivoStatoLabel,
  preventivoStatoHeaderPillClass,
  preventivoStatoPillStyle,
} from "@/lib/preventivi/preventivo-status-ui";
import {
  fmtPreventivoEuro,
  PreventivoEditorRiepilogoRow,
  PreventivoEditorTotalBar,
  preventivoEditorPanelClass,
} from "@/components/preventivi/preventivo-editor-totals";
import {
  lossReasonLabel,
  margineTierClass,
  profittoDirezioneLabel,
  type PreventivoAnalisiEconomicaApiResponse,
} from "@/lib/preventivi/preventivo-analisi-economica";
import { resolveMargineTier } from "@/lib/preventivi/preventivo-profitto";
import { gestionaleListTableTd } from "@/lib/ui/gestionale-list-table";
import { prevTableBodyTextClass, prevTableTd } from "@/components/preventivi/preventivi-table-shared";
import { preventivoEditorMoneyValue, preventivoEditorSubsectionTitle } from "@/components/preventivi/preventivo-editor-ui";
import { dsLabel } from "@/lib/ui/design-system";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";

function fmtPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
}

function fmtQty(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("it-IT", { maximumFractionDigits: 2 });
}

function fmtDataIt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function MargineCell({ margine }: { margine: number | null }) {
  const tier = resolveMargineTier(margine);
  return <span className={`tabular-nums ${margineTierClass(tier)}`}>{fmtPct(margine)}</span>;
}

function MoneyTone({
  value,
  tone,
}: {
  value: string;
  tone: "default" | "positive" | "negative";
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
        ? "text-red-600 dark:text-red-400"
        : "text-[color:var(--cab-text)]";
  return <span className={`font-semibold tabular-nums ${toneClass}`}>{value}</span>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-text)]">
      {children}
    </h3>
  );
}

function MetaItem({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0">
      <dt className={dsLabel}>{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-[color:var(--cab-text)]">{value}</dd>
      {sub ? <dd className="text-sm text-[color:var(--cab-text-muted)]">{sub}</dd> : null}
    </div>
  );
}

function ConfrontoLine({ label, preventivato, reale, scostamento }: {
  label: string;
  preventivato: string;
  reale: string;
  scostamento: string;
}) {
  return (
    <p className="text-sm text-[color:var(--cab-text-muted)]">
      <span className="font-medium text-[color:var(--cab-text)]">{label}:</span>
      {" preventivate "}
      <span className="tabular-nums">{preventivato}</span>
      {" · reali "}
      <span className="tabular-nums">{reale}</span>
      {" · scostamento "}
      <span className="tabular-nums text-[color:var(--cab-text)]">{scostamento}</span>
    </p>
  );
}

function AnalisiContent({ data }: { data: PreventivoAnalisiEconomicaApiResponse }) {
  const { header, summary, breakdown, indicatori, confronto, kpi, footerKpi } = data;
  const mano = breakdown.manodopera;
  const ricambi = breakdown.ricambi;
  const costiTot = summary.costi > 0 ? summary.costi : 1;
  const incidenzaMano = (breakdown.manodopera.totale.costo / costiTot) * 100;
  const incidenzaRic = (breakdown.ricambi.totale.costo / costiTot) * 100;
  const lossLabel = lossReasonLabel(indicatori.lossReason);
  const profitTone =
    summary.profitto > 0 ? "positive" : summary.profitto < 0 ? "negative" : "default";

  const categorie = [
    { id: "manodopera", label: "Manodopera", totale: breakdown.manodopera.totale },
    { id: "ricambi", label: "Ricambi", totale: breakdown.ricambi.totale },
    { id: "altri_costi", label: "Altri costi", totale: breakdown.altriCosti.totale },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-6">
      <header className="space-y-4 border-b border-[color:var(--cab-border)] pb-5">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-xl font-semibold tabular-nums text-[color:var(--cab-text)]">
              {header.numeroPreventivo}
            </p>
            <LavorazioneReadOnlyPill
              label={preventivoStatoLabel(header.statoPreventivo)}
              shellClass={preventivoStatoHeaderPillClass()}
              shellStyle={preventivoStatoPillStyle(header.statoPreventivo)}
              fullWidth={false}
            />
          </div>
          <p className="mt-1 text-sm text-[color:var(--cab-text-muted)]">
            {header.cliente}
            {header.mezzo ? ` · ${header.mezzo}` : ""}
          </p>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetaItem label="Data" value={fmtDataIt(header.dataCreazione)} />
          <MetaItem
            label="Lavorazione"
            value={header.lavorazioneCodice ?? "—"}
          />
          <MetaItem label="Ore lavorazione" value={fmtQty(header.oreLavorazione)} />
          <MetaItem
            label="Importo cliente"
            value={fmtPreventivoEuro(header.importoCliente)}
          />
        </dl>
      </header>

      {lossLabel ? (
        <div className="rounded-[var(--ds-radius-lg)] border border-red-300/60 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200">
          {lossLabel}
          {indicatori.lossCount > 0 ? ` · ${indicatori.lossCount} voci in perdita` : ""}
        </div>
      ) : null}

      <section>
        <SectionTitle>Sintesi economica</SectionTitle>
        <div className={preventivoEditorPanelClass}>
          <div className="grid gap-4 border-b border-[color:var(--cab-border)] px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className={dsLabel}>Ricavi</p>
              <p className={`mt-1 ${preventivoEditorMoneyValue}`}>{fmtPreventivoEuro(summary.ricavi)}</p>
            </div>
            <div>
              <p className={dsLabel}>Costi</p>
              <p className={`mt-1 ${preventivoEditorMoneyValue}`}>{fmtPreventivoEuro(summary.costi)}</p>
            </div>
            <div>
              <p className={dsLabel}>Profitto ({profittoDirezioneLabel(indicatori.profittoDirezione)})</p>
              <p className="mt-1">
                <MoneyTone value={fmtPreventivoEuro(summary.profitto)} tone={profitTone} />
              </p>
            </div>
            <div>
              <p className={dsLabel}>Margine</p>
              <p className="mt-1 text-base">
                <MargineCell margine={summary.margine} />
              </p>
              <p className="mt-1 text-xs text-[color:var(--cab-text-muted)]">
                Markup {fmtPct(summary.markup)} · ROI {fmtPct(kpi.roiCommessa)}
              </p>
            </div>
          </div>

          <div className="px-4 py-3 text-sm text-[color:var(--cab-text-muted)]">
            Incidenza costi: manodopera {fmtPct(incidenzaMano)} · ricambi {fmtPct(incidenzaRic)}
          </div>

          <PreventivoEditorRiepilogoRow label="Ricavi totali" value={fmtPreventivoEuro(summary.ricavi)} tone="subtotal" />
          <PreventivoEditorRiepilogoRow
            label="Costo manodopera"
            value={fmtPreventivoEuro(breakdown.manodopera.totale.costo)}
          />
          <PreventivoEditorRiepilogoRow
            label="Costo ricambi"
            value={fmtPreventivoEuro(breakdown.ricambi.totale.costo)}
          />
          <PreventivoEditorRiepilogoRow label="Altri costi" value={fmtPreventivoEuro(0)} />
          <PreventivoEditorTotalBar label="Totale costi" value={fmtPreventivoEuro(summary.costi)} />
          <PreventivoEditorTotalBar
            label="Utile lordo"
            value={fmtPreventivoEuro(summary.profitto)}
            emphasis="grand"
          />
        </div>
      </section>

      <section>
        <SectionTitle>Per categoria</SectionTitle>
        <GestionaleListTable
          masterScrollScope={false}
          headRow={
            <>
              <GlobalTableHeadLabel label="Voce" />
              <GlobalTableHeadLabel label="Ricavo" />
              <GlobalTableHeadLabel label="Costo" />
              <GlobalTableHeadLabel label="Profitto" />
              <GlobalTableHeadLabel label="Margine" />
            </>
          }
        >
          {categorie.map((c) => (
            <GestionaleListTableRow key={c.id}>
              <td className={prevTableTd}>{c.label}</td>
              <td className={`${gestionaleListTableTd} tabular-nums`}>{fmtPreventivoEuro(c.totale.ricavo)}</td>
              <td className={`${gestionaleListTableTd} tabular-nums`}>{fmtPreventivoEuro(c.totale.costo)}</td>
              <td className={`${gestionaleListTableTd} tabular-nums`}>{fmtPreventivoEuro(c.totale.profitto)}</td>
              <td className={prevTableTd}><MargineCell margine={c.totale.margine} /></td>
            </GestionaleListTableRow>
          ))}
        </GestionaleListTable>
      </section>

      <section className="space-y-1">
        <SectionTitle>Confronti</SectionTitle>
        <ConfrontoLine
          label="Ore"
          preventivato={fmtQty(confronto.ore.preventivato)}
          reale={fmtQty(confronto.ore.reale)}
          scostamento={fmtQty(confronto.ore.scostamento)}
        />
        <ConfrontoLine
          label="Ricambi (qty)"
          preventivato={fmtQty(confronto.ricambiQty.preventivato)}
          reale={fmtQty(confronto.ricambiQty.reale)}
          scostamento={fmtQty(confronto.ricambiQty.scostamento)}
        />
      </section>

      <section>
        <SectionTitle>Manodopera</SectionTitle>
        <GestionaleListTable
          masterScrollScope={false}
          headRow={
            <>
              <GlobalTableHeadLabel label="Voce" />
              <GlobalTableHeadLabel label="Ore prev." />
              <GlobalTableHeadLabel label="Ore reali" />
              <GlobalTableHeadLabel label="Scostamento" />
              <GlobalTableHeadLabel label="Costo €/h" />
              <GlobalTableHeadLabel label="Prezzo €/h" />
              <GlobalTableHeadLabel label="Costo" />
              <GlobalTableHeadLabel label="Ricavo" />
              <GlobalTableHeadLabel label="Profitto" />
              <GlobalTableHeadLabel label="Margine" />
            </>
          }
        >
          <GestionaleListTableRow>
            <td className={prevTableTd}>{mano.descrizione}</td>
            <td className={`${gestionaleListTableTd} tabular-nums`}>{fmtQty(confronto.ore.preventivato)}</td>
            <td className={`${gestionaleListTableTd} tabular-nums`}>{fmtQty(confronto.ore.reale)}</td>
            <td className={`${gestionaleListTableTd} tabular-nums`}>{fmtQty(confronto.ore.scostamento)}</td>
            <td className={`${gestionaleListTableTd} tabular-nums`}>{fmtPreventivoEuro(mano.costoOrarioInterno)}</td>
            <td className={`${gestionaleListTableTd} tabular-nums`}>{fmtPreventivoEuro(mano.prezzoVenditaOrario)}</td>
            <td className={`${gestionaleListTableTd} tabular-nums`}>{fmtPreventivoEuro(mano.costoReale)}</td>
            <td className={`${gestionaleListTableTd} tabular-nums`}>{fmtPreventivoEuro(mano.ricavo)}</td>
            <td className={`${gestionaleListTableTd} tabular-nums`}>{fmtPreventivoEuro(mano.profitto)}</td>
            <td className={prevTableTd}><MargineCell margine={mano.margine} /></td>
          </GestionaleListTableRow>
        </GestionaleListTable>
      </section>

      <section>
        <SectionTitle>Ricambi</SectionTitle>
        {ricambi.righe.length === 0 ? (
          <p className={prevTableBodyTextClass}>Nessuna riga ricambio.</p>
        ) : (
          <GestionaleListTable
            masterScrollScope={false}
            headRow={
              <>
                <GlobalTableHeadLabel label="Codice" />
                <GlobalTableHeadLabel label="Descrizione" />
                <GlobalTableHeadLabel label="Qty" />
                <GlobalTableHeadLabel label="Costo unit." />
                <GlobalTableHeadLabel label="Costo tot." />
                <GlobalTableHeadLabel label="Prezzo vend." />
                <GlobalTableHeadLabel label="Ricavo" />
                <GlobalTableHeadLabel label="Profitto" />
                <GlobalTableHeadLabel label="Margine" />
              </>
            }
          >
            {ricambi.righe.map((r) => (
              <GestionaleListTableRow
                key={r.id}
                className={r.vendutoSottoCosto ? "bg-amber-50/80 dark:bg-amber-950/20" : undefined}
              >
                <td className={prevTableTd}>{r.codice}</td>
                <td className={prevTableTd}>{r.descrizione}</td>
                <td className={`${gestionaleListTableTd} tabular-nums`}>{fmtQty(r.quantita)}</td>
                <td className={`${gestionaleListTableTd} tabular-nums`}>{fmtPreventivoEuro(r.costoUnitario)}</td>
                <td className={`${gestionaleListTableTd} tabular-nums`}>{fmtPreventivoEuro(r.costoTotale)}</td>
                <td className={`${gestionaleListTableTd} tabular-nums`}>{fmtPreventivoEuro(r.prezzoVenditaUnitario)}</td>
                <td className={`${gestionaleListTableTd} tabular-nums`}>{fmtPreventivoEuro(r.ricavo)}</td>
                <td className={`${gestionaleListTableTd} tabular-nums`}>{fmtPreventivoEuro(r.profitto)}</td>
                <td className={prevTableTd}><MargineCell margine={r.margine} /></td>
              </GestionaleListTableRow>
            ))}
          </GestionaleListTable>
        )}
      </section>

      <section>
        <SectionTitle>Altri costi</SectionTitle>
        <p className="text-sm text-[color:var(--cab-text-muted)]">
          Nessuna voce configurata — categorie future (trasporto, smaltimento, ecc.).
        </p>
      </section>

      {footerKpi.length > 0 ? (
        <section>
          <SectionTitle>Indicatori</SectionTitle>
          <div className="divide-y divide-[color:var(--cab-border)] rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface)]">
            {footerKpi.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
              >
                <span className={preventivoEditorSubsectionTitle}>{row.label}</span>
                <span className="shrink-0 tabular-nums text-[color:var(--cab-text)]">{row.value}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <p className="text-xs text-[color:var(--cab-text-muted)]">
        Generato il {new Date(data.metadata.generatedAt).toLocaleString("it-IT")} da {data.metadata.generatedBy}
        · v{data.metadata.version}
      </p>
    </div>
  );
}

async function fetchAnalisiEconomica(preventivoId: string): Promise<PreventivoAnalisiEconomicaApiResponse> {
  const res = await fetch(`/api/preventivi/${encodeURIComponent(preventivoId)}/analisi-economica`, {
    cache: "no-store",
  });
  const body = (await res.json()) as PreventivoAnalisiEconomicaApiResponse | { error?: string };
  if (!res.ok) {
    throw new Error("error" in body && body.error ? body.error : "Analisi non disponibile");
  }
  return body as PreventivoAnalisiEconomicaApiResponse;
}

export function PreventivoAnalisiEconomicaModal({
  preventivoId,
  onClose,
}: {
  preventivoId: string;
  onClose: () => void;
}) {
  const query = useQuery({
    queryKey: ["preventivi", preventivoId, "analisi-economica"],
    queryFn: () => fetchAnalisiEconomica(preventivoId),
    staleTime: 0,
  });

  return (
    <LavorazioniModalShell
      modalSize="analytics"
      title="Analisi economica"
      subtitle={query.data?.header.numeroPreventivo}
      onRequestClose={onClose}
    >
      <GestionaleModalScrollBody className={gestionaleModalBodyFlexClass}>
        {query.isLoading ? (
          <div
            className="flex min-h-[16rem] flex-col items-center justify-center gap-3 py-12"
            role="status"
            aria-busy="true"
          >
            <LoadingSpinner size="md" label="Calcolo analisi economica…" />
          </div>
        ) : query.isError ? (
          <div className="flex min-h-[12rem] flex-col items-center justify-center gap-3 py-8 text-center">
            <p className="text-sm text-red-600 dark:text-red-400">
              {query.error instanceof Error ? query.error.message : "Errore caricamento"}
            </p>
            <button
              type="button"
              className="text-sm font-medium text-[color:var(--cab-accent)] underline"
              onClick={() => void query.refetch()}
            >
              Riprova
            </button>
          </div>
        ) : query.data ? (
          <AnalisiContent data={query.data} />
        ) : null}
      </GestionaleModalScrollBody>
    </LavorazioniModalShell>
  );
}
