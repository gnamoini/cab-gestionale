"use client";

import { useMemo } from "react";
import { AddettoPicker, AddettoDisplayPill, addettoRefFromFields } from "@/components/domain/addetti";
import { SCHEDA_RIGA_ADDETTO_WRITE_RULES, stripAddettoLegacyFieldsOnWrite } from "@/lib/lavorazioni/addetto-write-freeze";
import { backfillAddettoIdFromLegacyString } from "@/lib/schede/schede-addetto-id-migrate";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { GlobalTableHead, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import {
  CaptureSheetAwareField,
  CaptureSheetFieldHintInline,
  CaptureSheetHintsBanner,
} from "@/components/document-capture/capture-sheet-field-hint";
import { CaptureSheetLavorazioneIdentBanner } from "@/components/document-capture/capture-sheet-lavorazione-ident-banner";
import type { LavorazioneAssignRowParts } from "@/lib/document-capture/capture-manual-assign-state";
import type { MezzoIdentificazioneParts } from "@/lib/mezzi/identificazione-mezzo";
import type { SchedaGlobalOpts } from "@/components/lavorazioni/schede/scheda-fields-types";
import type { CaptureSheetRowHint } from "@/components/lavorazioni/schede/scheda-fields-types";
import { SchedaDayField, SchedaLavorazioniEffettuateTextarea, SchedaMezzoIdentificazioneReadonly, SchedaOreNumberInput, todayItDate } from "@/components/lavorazioni/schede/scheda-form-utils";
import { newRigaId } from "@/lib/schede/schede-ui";
import { IconActionButton } from "@/components/design-system";
import { ShellNavIconClose } from "@/components/design-system/shell-nav-icons";
import { HubIconPlus } from "@/components/design-system/hub-table-action-icons";
import { preventivoEditorAddRowBtn } from "@/components/preventivi/preventivo-editor-ui";
import { dsInput, dsShellNavIconBtn, dsTable, dsTableRow, dsTableWrap, dsScrollbar } from "@/lib/ui/design-system";
import type { RigaAddettoOreScheda, RigaLavorazioneScheda, SchedaLavorazioniFields } from "@/types/schede";

function writeSchedaRigaAddetto(addettoId: string, oreImpiegate: number): RigaAddettoOreScheda {
  const id = addettoId.trim();
  return stripAddettoLegacyFieldsOnWrite(
    { addettoId: id || null, oreImpiegate, addetto: "" },
    SCHEDA_RIGA_ADDETTO_WRITE_RULES,
  ) as RigaAddettoOreScheda;
}

const LAV_DATE_INPUT = `${dsInput} w-[9.5rem] shrink-0`;
const LAV_ORE_INPUT = `!w-[2.75rem] !min-w-[2.75rem] !max-w-[2.75rem] shrink-0 px-1 text-center text-xs`;
const LAV_ADDETTO_PICKER_WRAP = "min-w-0 flex-1 basis-0 sm:min-w-[10rem]";
const LAV_TEXTAREA_CLASS = `${dsInput} !min-h-[9rem] w-full max-w-none leading-relaxed`;
const LAV_TEXTAREA_MAX_HEIGHT = "min(40dvh, 14rem)";
const LAV_ADD_INLINE_BTN = `${preventivoEditorAddRowBtn} !w-auto min-h-9 px-3 py-2`;
const LAV_ROW_REMOVE_BTN = `${dsShellNavIconBtn} !h-9 !w-9 text-[color:color-mix(in_srgb,var(--cab-danger)_75%,var(--cab-text))] hover:text-[color:var(--cab-danger)]`;

export type SchedaLavorazioniFormBodyProps = {
  value: SchedaLavorazioniFields;
  onChange: (fields: SchedaLavorazioniFields) => void;
  readonly?: boolean;
  globalOpts: SchedaGlobalOpts;
  rowHints?: Record<string, CaptureSheetRowHint>;
  reviewCount?: number;
  /** @deprecated usa variant="capture" */
  compactDateField?: boolean;
  variant?: "editor" | "capture";
  captureIdentParts?: LavorazioneAssignRowParts | null;
  /** Parti strutturate mezzo (hub) — griglia identificazione read-only. */
  identParts?: MezzoIdentificazioneParts | null;
  confirmDestructive?: (opts: {
    title: string;
    message: string;
    confirmLabel?: string;
  }) => Promise<boolean>;
};

export function SchedaLavorazioniFormBody({
  value,
  onChange,
  readonly = false,
  rowHints,
  reviewCount = 0,
  compactDateField = false,
  variant = "editor",
  captureIdentParts = null,
  identParts = null,
  confirmDestructive,
}: SchedaLavorazioniFormBodyProps) {
  const isCapture = variant === "capture" || compactDateField;
  const ro = readonly;
  const global = useGlobalOptions({ enabled: !ro });

  const resolveAddettoPickerId = (a: RigaAddettoOreScheda) =>
    a.addettoId?.trim() ||
    backfillAddettoIdFromLegacyString(global.lavorazioni.addettiRecords, a.addetto) ||
    "";

  const patchRigaAddetto = (r: RigaLavorazioneScheda, idx: number, patch: { addettoId?: string; oreImpiegate?: number }) => {
    const next = [...(r.addettiAssegnati ?? [])];
    const current = next[idx]!;
    next[idx] = writeSchedaRigaAddetto(
      patch.addettoId ?? resolveAddettoPickerId(current),
      patch.oreImpiegate ?? current.oreImpiegate,
    );
    return next;
  };

  const identLine = useMemo(
    () => value.identificazioneMacchina.trim() || "—",
    [value.identificazioneMacchina],
  );

  function patchRighe(righe: RigaLavorazioneScheda[]) {
    onChange({ ...value, righe });
  }

  function patchRiga(rid: string, fn: (r: RigaLavorazioneScheda) => RigaLavorazioneScheda) {
    patchRighe(value.righe.map((x) => (x.id === rid ? fn(x) : x)));
  }

  function removeAddetto(r: RigaLavorazioneScheda, idx: number) {
    const next = (r.addettiAssegnati ?? []).filter((_, j) => j !== idx);
    patchRiga(r.id, (row) => ({ ...row, addettiAssegnati: next }));
  }

  async function removeRiga(rid: string) {
    if (confirmDestructive) {
      const ok = await confirmDestructive({
        title: "Eliminare riga?",
        message: "La riga verrà rimossa dalla scheda.",
        confirmLabel: "Elimina",
      });
      if (!ok) return;
    }
    patchRighe(value.righe.filter((x) => x.id !== rid));
  }

  const fieldHintFooter = (fieldKey: string, hint?: CaptureSheetRowHint) =>
    hint?.message ? <CaptureSheetFieldHintInline fieldKey={fieldKey} hint={hint} embedded /> : undefined;

  const identBlock = isCapture ? (
    <CaptureSheetLavorazioneIdentBanner parts={captureIdentParts} fallbackIdent={identLine} />
  ) : (
    <SchedaMezzoIdentificazioneReadonly parts={identParts} fallbackLine={identLine} />
  );

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden">
      {reviewCount > 0 ? <CaptureSheetHintsBanner reviewCount={reviewCount} /> : null}
      {identBlock}

      <div className={`${dsTableWrap} ${dsScrollbar}`}>
        <table className={`${dsTable} text-xs`}>
          <GlobalTableHead>
            <GlobalTableHeadLabel label="Data" thClassName="w-[9.5rem]" />
            <GlobalTableHeadLabel label="Lavorazioni effettuate" thClassName="min-w-[min(100%,24rem)] w-full" />
            <GlobalTableHeadLabel label="Addetti (ore)" thClassName="min-w-[22rem]" />
            {!ro ? <GlobalTableHeadLabel label="" thClassName="w-12" /> : null}
          </GlobalTableHead>
          <tbody>
            {value.righe.map((r, rowIdx) => {
              const rowNum = rowIdx + 1;
              const lavKey = `riga_${rowNum}_lavorazione`;
              const nomeKey = `riga_${rowNum}_nome`;
              const dataKey = `riga_${rowNum}_data`;
              const oreKey = `riga_${rowNum}_ore`;
              const addetti = r.addettiAssegnati ?? [];

              return (
                <tr key={r.id} className={dsTableRow}>
                  <td className="w-[9.5rem] px-2 py-2 align-top">
                    {ro ? (
                      <span className="text-[color:var(--cab-text)]">{r.dataLavorazione}</span>
                    ) : (
                      <CaptureSheetAwareField hint={isCapture ? rowHints?.[dataKey] : undefined} footer={isCapture ? fieldHintFooter(dataKey, rowHints?.[dataKey]) : undefined}>
                        <SchedaDayField
                          label="Data"
                          showLabel={false}
                          showTodayButton={false}
                          inputClassName={LAV_DATE_INPUT}
                          value={r.dataLavorazione}
                          onChange={(v) => patchRiga(r.id, (row) => ({ ...row, dataLavorazione: v }))}
                        />
                      </CaptureSheetAwareField>
                    )}
                  </td>
                  <td className="px-2 py-2 align-top">
                    <CaptureSheetAwareField
                      hint={rowHints?.[lavKey]}
                      footer={fieldHintFooter(lavKey, rowHints?.[lavKey])}
                    >
                      <SchedaLavorazioniEffettuateTextarea
                        className={LAV_TEXTAREA_CLASS}
                        size="sm"
                        maxHeight={LAV_TEXTAREA_MAX_HEIGHT}
                        readOnly={ro}
                        value={r.lavorazioniEffettuate}
                        onChange={(v) => patchRiga(r.id, (row) => ({ ...row, lavorazioniEffettuate: v }))}
                      />
                    </CaptureSheetAwareField>
                  </td>
                  <td className="px-2 py-2 align-top">
                    {ro ? (
                      <div className="space-y-1.5 text-[color:var(--cab-text)]">
                        {addetti.length ? (
                          addetti.map((a, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <AddettoDisplayPill
                                ref={addettoRefFromFields({ addettoId: a.addettoId, addettoLegacy: a.addetto })}
                                fullWidth={false}
                              />
                              <span className="tabular-nums">{a.oreImpiegate}h</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-[color:var(--cab-text-muted)]">—</span>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {addetti.length === 0 ? (
                          <button
                            type="button"
                            className={LAV_ADD_INLINE_BTN}
                            onClick={() =>
                              patchRiga(r.id, (row) => ({
                                ...row,
                                addettiAssegnati: [writeSchedaRigaAddetto("", 0)],
                              }))
                            }
                          >
                            <HubIconPlus className="h-4 w-4 shrink-0" aria-hidden />
                            Aggiungi addetto
                          </button>
                        ) : (
                          addetti.map((a, idx) => (
                            <CaptureSheetAwareField
                              key={`${r.id}-a-${idx}`}
                              hint={idx === 0 && isCapture ? rowHints?.[nomeKey] : undefined}
                              footer={idx === 0 && isCapture ? fieldHintFooter(nomeKey, rowHints?.[nomeKey]) : undefined}
                            >
                              <div className="flex min-w-0 items-stretch gap-2">
                                <div className={`${LAV_ADDETTO_PICKER_WRAP} flex items-stretch`}>
                                  <AddettoPicker
                                    value={resolveAddettoPickerId(a) || null}
                                    onChange={(id) =>
                                      patchRiga(r.id, (row) => ({
                                        ...row,
                                        addettiAssegnati: patchRigaAddetto(row, idx, { addettoId: id }),
                                      }))
                                    }
                                    ariaLabel="Addetto riga lavorazione"
                                    className="w-full min-w-0 [&_.min-h-8]:!min-h-10 [&_button]:!min-h-10"
                                    size="form"
                                  />
                                </div>
                                <div className="shrink-0">
                                  <CaptureSheetAwareField
                                    hint={idx === 0 && isCapture ? rowHints?.[oreKey] : undefined}
                                    footer={idx === 0 && isCapture ? fieldHintFooter(oreKey, rowHints?.[oreKey]) : undefined}
                                  >
                                    <div className="flex items-center gap-1">
                                      <SchedaOreNumberInput
                                        className={LAV_ORE_INPUT}
                                        value={Number.isFinite(a.oreImpiegate) ? a.oreImpiegate : 0}
                                        onChange={(v) =>
                                          patchRiga(r.id, (row) => ({
                                            ...row,
                                            addettiAssegnati: patchRigaAddetto(row, idx, { oreImpiegate: v }),
                                          }))
                                        }
                                      />
                                      <span className="shrink-0 text-sm text-[color:var(--cab-text-muted)]">h</span>
                                    </div>
                                  </CaptureSheetAwareField>
                                </div>
                                <div className="flex shrink-0 items-center self-center">
                                  <IconActionButton
                                    type="button"
                                    label="Rimuovi addetto"
                                    className={LAV_ROW_REMOVE_BTN}
                                    onClick={() => removeAddetto(r, idx)}
                                  >
                                    <ShellNavIconClose dense className="h-5 w-5" />
                                  </IconActionButton>
                                </div>
                              </div>
                            </CaptureSheetAwareField>
                          ))
                        )}
                        {addetti.length > 0 ? (
                          <button
                            type="button"
                            className={LAV_ADD_INLINE_BTN}
                            onClick={() =>
                              patchRiga(r.id, (row) => ({
                                ...row,
                                addettiAssegnati: [...(row.addettiAssegnati ?? []), writeSchedaRigaAddetto("", 0)],
                              }))
                            }
                          >
                            <HubIconPlus className="h-4 w-4 shrink-0" aria-hidden />
                            Aggiungi addetto
                          </button>
                        ) : null}
                      </div>
                    )}
                  </td>
                  {!ro ? (
                    <td className="px-2 py-2 align-top">
                      <div className="flex justify-end">
                        <IconActionButton
                          type="button"
                          label="Rimuovi riga lavorazione"
                          className={LAV_ROW_REMOVE_BTN}
                          onClick={() => void removeRiga(r.id)}
                        >
                          <ShellNavIconClose dense className="h-5 w-5" />
                        </IconActionButton>
                      </div>
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
          className={preventivoEditorAddRowBtn}
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
          <HubIconPlus className="h-4 w-4 shrink-0" aria-hidden />
          Aggiungi riga lavorazione
        </button>
      ) : null}
    </div>
  );
}
