"use client";

import { GlobalSettingsListSelect } from "@/components/gestionale/global-input";
import { GestionaleTextarea } from "@/components/gestionale/gestionale-textarea";
import { GlobalTableHead, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import {
  CaptureSheetAwareField,
  CaptureSheetFieldHintInline,
  CaptureSheetHintsBanner,
} from "@/components/document-capture/capture-sheet-field-hint";
import type { SchedaGlobalOpts } from "@/components/lavorazioni/schede/scheda-fields-types";
import type { CaptureSheetRowHint } from "@/components/lavorazioni/schede/scheda-fields-types";
import { SchedaDayField, SchedaOreNumberInput, todayItDate } from "@/components/lavorazioni/schede/scheda-form-utils";
import { newRigaId } from "@/lib/schede/schede-ui";
import { dsBtnNeutral, dsInput, dsLabel, dsTable, dsTableRow, dsTableWrap, dsScrollbar, gestionaleTextareaMaxHeightCompact } from "@/lib/ui/design-system";
import type { RigaLavorazioneScheda, SchedaLavorazioniFields } from "@/types/schede";

export type SchedaLavorazioniFormBodyProps = {
  value: SchedaLavorazioniFields;
  onChange: (fields: SchedaLavorazioniFields) => void;
  readonly?: boolean;
  globalOpts: SchedaGlobalOpts;
  rowHints?: Record<string, CaptureSheetRowHint>;
  reviewCount?: number;
};

export function SchedaLavorazioniFormBody({
  value,
  onChange,
  readonly = false,
  rowHints,
  reviewCount = 0,
}: SchedaLavorazioniFormBodyProps) {
  const ro = readonly;

  function patchRighe(righe: RigaLavorazioneScheda[]) {
    onChange({ ...value, righe });
  }

  function patchRiga(rid: string, fn: (r: RigaLavorazioneScheda) => RigaLavorazioneScheda) {
    patchRighe(value.righe.map((x) => (x.id === rid ? fn(x) : x)));
  }

  return (
    <div className="space-y-4">
      {reviewCount > 0 ? <CaptureSheetHintsBanner reviewCount={reviewCount} /> : null}
      <label className="block text-xs">
        <span className={dsLabel}>Identificazione macchina</span>
        <input
          className={`${dsInput} mt-1`}
          readOnly={ro}
          value={value.identificazioneMacchina}
          onChange={(e) => onChange({ ...value, identificazioneMacchina: e.target.value })}
        />
      </label>
      <div className={`${dsTableWrap} ${dsScrollbar}`}>
        <table className={`${dsTable} text-xs`}>
          <GlobalTableHead>
            <GlobalTableHeadLabel label="Data" />
            <GlobalTableHeadLabel label="Lavorazioni effettuate" thClassName="min-w-[min(100%,28rem)] w-full" />
            <GlobalTableHeadLabel label="Addetti (ore)" thClassName="min-w-[12rem]" />
            {!ro ? <GlobalTableHeadLabel label="" thClassName="w-24" /> : null}
          </GlobalTableHead>
          <tbody>
            {value.righe.map((r, rowIdx) => {
              const rowNum = rowIdx + 1;
              const lavKey = `riga_${rowNum}_lavorazione`;
              const nomeKey = `riga_${rowNum}_nome`;
              return (
                <tr key={r.id} className={dsTableRow}>
                  <td className="px-2 py-2 align-top">
                    {ro ? (
                      <span className="text-[color:var(--cab-text)]">{r.dataLavorazione}</span>
                    ) : (
                      <SchedaDayField
                        label="Data"
                        showLabel={false}
                        value={r.dataLavorazione}
                        onChange={(v) => patchRiga(r.id, (row) => ({ ...row, dataLavorazione: v }))}
                      />
                    )}
                  </td>
                  <td className="px-2 py-2 align-top">
                    <CaptureSheetAwareField
                      hint={rowHints?.[lavKey]}
                      footer={
                        rowHints?.[lavKey] ? (
                          <CaptureSheetFieldHintInline fieldKey={lavKey} hint={rowHints[lavKey]} embedded />
                        ) : undefined
                      }
                    >
                      <GestionaleTextarea
                        className="!py-2 !text-sm w-full max-w-none leading-relaxed"
                        size="sm"
                        maxHeight={gestionaleTextareaMaxHeightCompact}
                        readOnly={ro}
                        value={r.lavorazioniEffettuate}
                        onChange={(v) => patchRiga(r.id, (row) => ({ ...row, lavorazioniEffettuate: v }))}
                      />
                    </CaptureSheetAwareField>
                  </td>
                  <td className="px-2 py-2 align-top">
                    {ro ? (
                      <div className="space-y-0.5 text-[color:var(--cab-text)]">
                        {(r.addettiAssegnati ?? []).length ? (
                          r.addettiAssegnati!.map((a, i) => (
                            <div key={i}>
                              {a.addetto || "—"} — {a.oreImpiegate}h
                            </div>
                          ))
                        ) : (
                          <span className="text-[color:var(--cab-text-muted)]">—</span>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(r.addettiAssegnati ?? []).map((a, idx) => (
                          <CaptureSheetAwareField
                            key={`${r.id}-a-${idx}`}
                            hint={idx === 0 ? rowHints?.[nomeKey] : undefined}
                            footer={
                              idx === 0 && rowHints?.[nomeKey] ? (
                                <CaptureSheetFieldHintInline fieldKey={nomeKey} hint={rowHints[nomeKey]} embedded />
                              ) : undefined
                            }
                          >
                            <div className="flex flex-nowrap items-end gap-1 sm:flex-wrap">
                              <div className="min-w-0 flex-1">
                                <GlobalSettingsListSelect
                                  listKey="lavorazioni:addetti"
                                  className="w-full"
                                  inputClassName={`${dsInput} !py-1.5 !text-xs`}
                                  value={a.addetto}
                                  onChange={(v) => {
                                    const next = [...(r.addettiAssegnati ?? [])];
                                    next[idx] = { ...next[idx]!, addetto: v };
                                    patchRiga(r.id, (row) => ({ ...row, addettiAssegnati: next }));
                                  }}
                                  placeholder="Seleziona addetto…"
                                  aria-label="Addetto riga lavorazione"
                                />
                              </div>
                              <SchedaOreNumberInput
                                className={`${dsInput} !py-1.5 !text-xs w-20`}
                                value={Number.isFinite(a.oreImpiegate) ? a.oreImpiegate : 0}
                                onChange={(v) => {
                                  const next = [...(r.addettiAssegnati ?? [])];
                                  next[idx] = { ...next[idx]!, oreImpiegate: v };
                                  patchRiga(r.id, (row) => ({ ...row, addettiAssegnati: next }));
                                }}
                              />
                              <button
                                type="button"
                                className="shrink-0 rounded p-1 text-sm text-[color:var(--cab-text-muted)] transition hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                                aria-label="Rimuovi addetto"
                                onClick={() => {
                                  const next = (r.addettiAssegnati ?? []).filter((_, j) => j !== idx);
                                  patchRiga(r.id, (row) => ({ ...row, addettiAssegnati: next }));
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          </CaptureSheetAwareField>
                        ))}
                        <button
                          type="button"
                          className={`${dsBtnNeutral} text-[10px] px-2 py-1`}
                          onClick={() =>
                            patchRiga(r.id, (row) => ({
                              ...row,
                              addettiAssegnati: [...(row.addettiAssegnati ?? []), { addetto: "", oreImpiegate: 0 }],
                            }))
                          }
                        >
                          + Aggiungi addetto
                        </button>
                      </div>
                    )}
                  </td>
                  {!ro ? (
                    <td className="px-2 py-2 align-top">
                      <button
                        type="button"
                        className="rounded p-1.5 text-sm text-[color:var(--cab-text-muted)] transition hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                        aria-label="Rimuovi riga lavorazione"
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
                dataLavorazione: todayItDate(),
                lavorazioniEffettuate: "",
                addettiAssegnati: [],
              },
            ])
          }
        >
          + Aggiungi riga lavorazione
        </button>
      ) : null}
    </div>
  );
}
