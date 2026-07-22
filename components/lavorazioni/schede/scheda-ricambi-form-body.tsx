"use client";

import { useMemo, useState } from "react";
import { GlobalSettingsListSelect } from "@/components/gestionale/global-input";
import { GlobalTableHead, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import {
  CaptureSheetAwareField,
  CaptureSheetFieldHintInline,
  CaptureSheetHintsBanner,
} from "@/components/document-capture/capture-sheet-field-hint";
import type { SchedaRicambiFormOpts } from "@/components/lavorazioni/schede/scheda-fields-types";
import type { CaptureSheetRowHint } from "@/components/lavorazioni/schede/scheda-fields-types";
import { SchedaDayField, todayItDate } from "@/components/lavorazioni/schede/scheda-form-utils";
import { newRigaId } from "@/lib/schede/schede-ui";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { ricambioCodiceForUi } from "@/lib/magazzino/ricambio-codice";
import { dsBtnNeutral, dsInput, dsTable, dsTableRow, dsTableWrap, dsScrollbar } from "@/lib/ui/design-system";
import type { RigaRicambioScheda, SchedaRicambiFields } from "@/types/schede";

export type SchedaRicambiFormBodyProps = {
  value: SchedaRicambiFields;
  onChange: (fields: SchedaRicambiFields) => void;
  readonly?: boolean;
  globalOpts: SchedaRicambiFormOpts;
  rowHints?: Record<string, CaptureSheetRowHint>;
  reviewCount?: number;
  /** Capture compile: no colonna scarico magazzino. */
  variant?: "editor" | "capture";
};

function suggestionsForRow(r: RigaRicambioScheda, prodotti: readonly RicambioMagazzino[]) {
  const q = `${r.ricambioNome} ${r.codice}`.trim().toLowerCase();
  if (q.length < 1) return [];
  return prodotti
    .filter((p) => {
      const d = (p.descrizione ?? "").toLowerCase();
      const c = [ricambioCodiceForUi(p.codiceFornitoreOriginale), p.codiceFornitoreOriginaleSecondario]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const m = (p.marca ?? "").toLowerCase();
      return d.includes(q) || c.includes(q) || m.includes(q) || q.split(/\s+/).every((w) => w && (d.includes(w) || c.includes(w) || m.includes(w)));
    })
    .slice(0, 12);
}

export function SchedaRicambiFormBody({
  value,
  onChange,
  readonly = false,
  globalOpts,
  rowHints,
  reviewCount = 0,
  variant = "capture",
}: SchedaRicambiFormBodyProps) {
  const ro = readonly;
  const prodotti = globalOpts.magazzino ?? [];
  const [acRowId, setAcRowId] = useState<string | null>(null);
  const showMagazzinoColumn = variant === "editor";

  function patchRighe(righe: RigaRicambioScheda[]) {
    onChange({ ...value, righe });
  }

  const identLine = useMemo(
    () => value.identificazioneMacchina.trim() || "—",
    [value.identificazioneMacchina],
  );

  return (
    <div className="space-y-4">
      {reviewCount > 0 ? <CaptureSheetHintsBanner reviewCount={reviewCount} /> : null}
      <p className="text-xs text-[color:var(--cab-text-muted)]">
        Identificazione: <span className="font-medium text-[color:var(--cab-text)]">{identLine}</span>
      </p>
      <div className={`${dsTableWrap} ${dsScrollbar}`}>
        <table className={`${dsTable} text-xs`}>
          <GlobalTableHead>
            <GlobalTableHeadLabel label="Ricambio" thClassName="min-w-[10rem]" />
            <GlobalTableHeadLabel label="Codice" />
            <GlobalTableHeadLabel label="Qtà" />
            <GlobalTableHeadLabel label="Addetto" />
            <GlobalTableHeadLabel label="Data" />
            {showMagazzinoColumn && !ro ? <GlobalTableHeadLabel label="Magazzino" /> : null}
            {!ro ? <GlobalTableHeadLabel label="" thClassName="w-24" /> : null}
          </GlobalTableHead>
          <tbody>
            {value.righe.map((r, rowIdx) => {
              const rowNum = rowIdx + 1;
              const codiceKey = `riga_${rowNum}_codice`;
              const nomeKey = `riga_${rowNum}_nome`;
              const sug = !ro && acRowId === r.id ? suggestionsForRow(r, prodotti) : [];
              return (
                <tr key={r.id} className={dsTableRow} data-ricambi-ac-open={acRowId === r.id ? "1" : undefined}>
                  <td className="px-2 py-2 align-top">
                    <CaptureSheetAwareField
                      hint={rowHints?.[nomeKey]}
                      footer={
                        rowHints?.[nomeKey] ? (
                          <CaptureSheetFieldHintInline fieldKey={nomeKey} hint={rowHints[nomeKey]} embedded />
                        ) : undefined
                      }
                    >
                      {ro ? (
                        <span>{r.ricambioNome || "—"}</span>
                      ) : (
                        <div className="space-y-1">
                          <input
                            className={`${dsInput} !py-1.5 !text-xs w-full`}
                            value={r.ricambioNome}
                            onChange={(e) => {
                              patchRighe(value.righe.map((x) => (x.id === r.id ? { ...x, ricambioNome: e.target.value } : x)));
                              setAcRowId(r.id);
                            }}
                            onFocus={() => setAcRowId(r.id)}
                            placeholder="Nome ricambio"
                            aria-label="Ricambio"
                          />
                          {sug.length > 0 ? (
                            <ul className="max-h-32 space-y-0.5 overflow-y-auto rounded border border-[color:var(--cab-border)] bg-[var(--cab-card)] p-1">
                              {sug.map((p) => (
                                <li key={p.id}>
                                  <button
                                    type="button"
                                    className="w-full rounded px-2 py-1 text-left text-[11px] hover:bg-[var(--cab-surface-2)]"
                                    onClick={() => {
                                      patchRighe(
                                        value.righe.map((x) =>
                                          x.id === r.id
                                            ? {
                                                ...x,
                                                ricambioId: p.id,
                                                ricambioNome: p.descrizione ?? "",
                                                codice: ricambioCodiceForUi(p.codiceFornitoreOriginale),
                                              }
                                            : x,
                                        ),
                                      );
                                      setAcRowId(null);
                                    }}
                                  >
                                    {(() => {
                                      const codiceUi = ricambioCodiceForUi(p.codiceFornitoreOriginale);
                                      return codiceUi ? `${p.descrizione} — ${codiceUi}` : p.descrizione;
                                    })()}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      )}
                    </CaptureSheetAwareField>
                  </td>
                  <td className="px-2 py-2 align-top">
                    <CaptureSheetAwareField
                      hint={rowHints?.[codiceKey]}
                      footer={
                        rowHints?.[codiceKey] ? (
                          <CaptureSheetFieldHintInline fieldKey={codiceKey} hint={rowHints[codiceKey]} embedded />
                        ) : undefined
                      }
                    >
                      <input
                        className={`${dsInput} !py-1.5 !text-xs`}
                        readOnly={ro}
                        value={r.codice}
                        onChange={(e) => {
                          const v = e.target.value;
                          patchRighe(value.righe.map((x) => (x.id === r.id ? { ...x, codice: v } : x)));
                          if (!ro) setAcRowId(r.id);
                        }}
                        onFocus={() => !ro && setAcRowId(r.id)}
                      />
                    </CaptureSheetAwareField>
                  </td>
                  <td className="px-2 py-2 align-top">
                    <input
                      type="number"
                      min={1}
                      className={`${dsInput} !py-1.5 !text-xs w-20`}
                      readOnly={ro}
                      value={r.quantita}
                      onChange={(e) =>
                        patchRighe(
                          value.righe.map((x) =>
                            x.id === r.id ? { ...x, quantita: Math.max(1, Math.round(Number(e.target.value) || 1)) } : x,
                          ),
                        )
                      }
                    />
                  </td>
                  <td className="px-2 py-2 align-top">
                    {ro ? (
                      <span>{r.addetto}</span>
                    ) : (
                      <GlobalSettingsListSelect
                        listKey="lavorazioni:addetti"
                        className="w-full min-w-[8rem]"
                        inputClassName={`${dsInput} !py-1.5 !text-xs`}
                        value={r.addetto}
                        onChange={(v) => patchRighe(value.righe.map((x) => (x.id === r.id ? { ...x, addetto: v } : x)))}
                        placeholder="Addetto…"
                        aria-label="Addetto riga ricambio"
                      />
                    )}
                  </td>
                  <td className="px-2 py-2 align-top">
                    {ro ? (
                      <span>{r.dataUtilizzo}</span>
                    ) : (
                      <SchedaDayField
                        label="Data"
                        showLabel={false}
                        value={r.dataUtilizzo}
                        onChange={(v) => patchRighe(value.righe.map((x) => (x.id === r.id ? { ...x, dataUtilizzo: v } : x)))}
                      />
                    )}
                  </td>
                  {!ro ? (
                    <td className="px-2 py-2 align-top">
                      <button
                        type="button"
                        className="rounded p-1.5 text-sm text-[color:var(--cab-text-muted)] transition hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                        aria-label="Rimuovi riga ricambio"
                        onClick={() => patchRighe(value.righe.filter((x) => x.id !== r.id))}
                      >
                        ✕
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!ro ? (
        <button
          type="button"
          className={dsBtnNeutral}
          onClick={() =>
            patchRighe([
              ...value.righe,
              {
                id: newRigaId(),
                ricambioId: null,
                ricambioNome: "",
                codice: "",
                quantita: 1,
                addetto: globalOpts.defaultAddetto ?? "",
                dataUtilizzo: todayItDate(),
              },
            ])
          }
        >
          + Aggiungi riga ricambio
        </button>
      ) : null}
    </div>
  );
}
