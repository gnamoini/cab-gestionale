"use client";

import { useMemo } from "react";
import { GlobalSettingsListSelect } from "@/components/gestionale/global-input";
import { GlobalTableHead, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import {
  CaptureSheetAwareField,
  CaptureSheetFieldHintInline,
  CaptureSheetHintsBanner,
} from "@/components/document-capture/capture-sheet-field-hint";
import { CaptureSheetLavorazioneIdentBanner } from "@/components/document-capture/capture-sheet-lavorazione-ident-banner";
import type { LavorazioneAssignRowParts } from "@/lib/document-capture/capture-manual-assign-state";
import type { SchedaGlobalOpts } from "@/components/lavorazioni/schede/scheda-fields-types";
import type { CaptureSheetRowHint } from "@/components/lavorazioni/schede/scheda-fields-types";
import { SchedaDayField, SchedaLavorazioniEffettuateTextarea, SchedaOreNumberInput, todayItDate } from "@/components/lavorazioni/schede/scheda-form-utils";
import { newRigaId } from "@/lib/schede/schede-ui";
import { dsBtnNeutral, dsInput, dsInputNoSpinner, dsLabel, dsTable, dsTableRow, dsTableWrap, dsScrollbar } from "@/lib/ui/design-system";
import type { RigaLavorazioneScheda, SchedaLavorazioniFields } from "@/types/schede";

const CAPTURE_LAVORAZIONE_TEXT_MAX_HEIGHT = "min(48dvh, 14rem)";
const CAPTURE_FIELD = `${dsInput} w-full min-w-0`;
const CAPTURE_DATE_CELL = "min-w-0 w-full sm:w-[11rem] sm:shrink-0";
const CAPTURE_ADDETTO_CELL = "min-w-0 flex-1 basis-[8rem]";
const CAPTURE_ORE_INPUT = `${dsInput} ${dsInputNoSpinner} w-full max-w-[5.5rem] tabular-nums text-center`;
const CAPTURE_ORE_CELL = "w-[5.5rem] shrink-0 min-w-0";
const CAPTURE_ADD_BTN = `${dsBtnNeutral} flex size-10 shrink-0 items-center justify-center p-0 text-base leading-none sm:size-auto sm:min-h-[2.75rem] sm:min-w-[2.75rem]`;

function CaptureLavorazioneRigaMeta({
  r,
  ro,
  nomeKey,
  dataKey,
  oreKey,
  rowHints,
  onPatch,
  onRemoveRiga,
}: {
  r: RigaLavorazioneScheda;
  ro: boolean;
  nomeKey: string;
  dataKey: string;
  oreKey: string;
  rowHints?: Record<string, CaptureSheetRowHint>;
  onPatch: (fn: (row: RigaLavorazioneScheda) => RigaLavorazioneScheda) => void;
  onRemoveRiga: () => void;
}) {
  const nomeHint = rowHints?.[nomeKey];
  const dataHint = rowHints?.[dataKey];
  const oreHint = rowHints?.[oreKey];
  const addetti = r.addettiAssegnati ?? [];

  const fieldHintFooter = (fieldKey: string, hint?: CaptureSheetRowHint) =>
    hint?.message ? <CaptureSheetFieldHintInline fieldKey={fieldKey} hint={hint} embedded /> : undefined;

  const patchAddetto = (idx: number, patch: Partial<(typeof addetti)[number]>) => {
    const next = [...addetti];
    next[idx] = { ...next[idx]!, ...patch };
    onPatch((row) => ({ ...row, addettiAssegnati: next }));
  };

  const appendAddetto = () => {
    onPatch((row) => ({
      ...row,
      addettiAssegnati: [...(row.addettiAssegnati ?? []), { addetto: "", oreImpiegate: 0 }],
    }));
  };

  const ensureFirstAddetto = () => {
    onPatch((row) => ({ ...row, addettiAssegnati: [{ addetto: "", oreImpiegate: 0 }] }));
  };

  const renderDateField = () =>
    ro ? (
      <span className={`${CAPTURE_FIELD} flex items-center`}>{r.dataLavorazione}</span>
    ) : (
      <CaptureSheetAwareField hint={dataHint} footer={fieldHintFooter(dataKey, dataHint)}>
        <SchedaDayField
          label="Data"
          showLabel={false}
          showTodayButton={false}
          className="w-full"
          inputClassName={CAPTURE_FIELD}
          value={r.dataLavorazione}
          onChange={(v) => onPatch((row) => ({ ...row, dataLavorazione: v }))}
        />
      </CaptureSheetAwareField>
    );

  const renderAddettoField = (a: (typeof addetti)[number], idx: number) => (
    <div className={CAPTURE_ADDETTO_CELL}>
      {ro ? (
        <span className={`${CAPTURE_FIELD} flex items-center`}>{a.addetto || "—"}</span>
      ) : (
        <CaptureSheetAwareField hint={idx === 0 ? nomeHint : undefined} footer={idx === 0 ? fieldHintFooter(nomeKey, nomeHint) : undefined}>
          <GlobalSettingsListSelect
            listKey="lavorazioni:addetti"
            className="w-full min-w-0"
            inputClassName={`${CAPTURE_FIELD} !pr-7`}
            value={a.addetto}
            onChange={(v) => patchAddetto(idx, { addetto: v })}
            placeholder="Addetto"
            selectOnly
            allowAdd={false}
            disableRecents
            mobileSheetMode="selectOnly"
            aria-label="Addetto riga lavorazione"
          />
        </CaptureSheetAwareField>
      )}
    </div>
  );

  const renderAppendAddettoBtn = () =>
    !ro ? (
      <button type="button" className={CAPTURE_ADD_BTN} aria-label="Aggiungi addetto" onClick={appendAddetto}>
        +
      </button>
    ) : null;

  const renderOreWithAddBtn = (a: (typeof addetti)[number], idx: number, showAddBtn: boolean) => (
    <div className="flex min-w-0 shrink-0 items-start gap-1">
      <div className={CAPTURE_ORE_CELL}>
        <CaptureSheetAwareField
          hint={idx === 0 ? oreHint : undefined}
          footer={idx === 0 ? fieldHintFooter(oreKey, oreHint) : undefined}
        >
          <div className="flex min-w-0 items-center gap-1">
            {ro ? (
              <span className={`${CAPTURE_ORE_INPUT} flex items-center justify-center`}>{a.oreImpiegate}</span>
            ) : (
              <SchedaOreNumberInput
                className={CAPTURE_ORE_INPUT}
                value={Number.isFinite(a.oreImpiegate) ? a.oreImpiegate : 0}
                onChange={(v) => patchAddetto(idx, { oreImpiegate: v })}
              />
            )}
            <span className="shrink-0 text-sm text-[color:var(--cab-text-muted)]">h</span>
          </div>
        </CaptureSheetAwareField>
      </div>
      {showAddBtn ? renderAppendAddettoBtn() : <span className="size-10 shrink-0 sm:min-w-[2.75rem]" aria-hidden />}
    </div>
  );

  const removeAddettoBtn = (idx: number) =>
    !ro ? (
      <button
        type="button"
        className="shrink-0 rounded p-1.5 text-sm text-[color:var(--cab-text-muted)] transition hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
        aria-label="Rimuovi addetto"
        onClick={() => {
          onPatch((row) => ({
            ...row,
            addettiAssegnati: (row.addettiAssegnati ?? []).filter((_, j) => j !== idx),
          }));
        }}
      >
        ✕
      </button>
    ) : (
      <span className="w-[1.75rem] shrink-0" aria-hidden />
    );

  const removeRigaBtn = !ro ? (
    <button
      type="button"
      className="shrink-0 rounded p-1.5 text-sm text-[color:var(--cab-text-muted)] transition hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
      aria-label="Rimuovi riga lavorazione"
      onClick={onRemoveRiga}
    >
      ✕
    </button>
  ) : null;

  return (
    <div className="border-b border-[color:var(--cab-border)]">
      <div className="flex w-full min-w-0 flex-wrap items-start gap-2 p-2.5">
        <div className={CAPTURE_DATE_CELL}>{renderDateField()}</div>

        {addetti.length === 0 ? (
          !ro ? (
            <button
              type="button"
              className={`${dsBtnNeutral} ${CAPTURE_ADDETTO_CELL} min-h-[2.75rem] px-3 text-sm`}
              onClick={ensureFirstAddetto}
            >
              + Addetto
            </button>
          ) : (
            <span className={`${CAPTURE_ADDETTO_CELL} flex min-h-[2.75rem] items-center text-sm text-[color:var(--cab-text-muted)]`}>
              —
            </span>
          )
        ) : (
          <>
            {renderAddettoField(addetti[0]!, 0)}
            {renderOreWithAddBtn(addetti[0]!, 0, true)}
          </>
        )}

        {removeRigaBtn}
      </div>

      {addetti.slice(1).map((a, i) => (
        <div key={`${r.id}-a-${i + 1}`} className="flex w-full min-w-0 flex-wrap items-start gap-2 px-2.5 pb-2">
          <div className={`${CAPTURE_DATE_CELL} hidden sm:block`} aria-hidden />
          {renderAddettoField(a, i + 1)}
          {renderOreWithAddBtn(a, i + 1, false)}
          {removeAddettoBtn(i + 1)}
        </div>
      ))}

    </div>
  );
}

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
}: SchedaLavorazioniFormBodyProps) {
  const isCapture = variant === "capture" || compactDateField;
  const ro = readonly;

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

  if (isCapture) {
    return (
      <div className="min-w-0 space-y-4 overflow-x-hidden">
        {reviewCount > 0 ? <CaptureSheetHintsBanner reviewCount={reviewCount} /> : null}
        <CaptureSheetLavorazioneIdentBanner parts={captureIdentParts} fallbackIdent={identLine} />

        <div className="min-w-0 space-y-3">
          {value.righe.map((r, rowIdx) => {
            const rowNum = rowIdx + 1;
            const lavKey = `riga_${rowNum}_lavorazione`;
            const nomeKey = `riga_${rowNum}_nome`;
            const dataKey = `riga_${rowNum}_data`;
            const oreKey = `riga_${rowNum}_ore`;
            return (
              <div
                key={r.id}
                className="min-w-0 overflow-hidden rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:var(--cab-surface)]"
              >
                <CaptureLavorazioneRigaMeta
                  r={r}
                  ro={ro}
                  nomeKey={nomeKey}
                  dataKey={dataKey}
                  oreKey={oreKey}
                  rowHints={rowHints}
                  onPatch={(fn) => patchRiga(r.id, fn)}
                  onRemoveRiga={() => patchRighe(value.righe.filter((x) => x.id !== r.id))}
                />
                <div className="min-w-0 p-2.5">
                  <CaptureSheetAwareField
                    hint={rowHints?.[lavKey]}
                    footer={
                      rowHints?.[lavKey] ? (
                        <CaptureSheetFieldHintInline fieldKey={lavKey} hint={rowHints[lavKey]} embedded />
                      ) : undefined
                    }
                  >
                    <SchedaLavorazioniEffettuateTextarea
                      className={`${dsInput} !min-h-[7rem] w-full max-w-none leading-relaxed`}
                      size="sm"
                      maxHeight={CAPTURE_LAVORAZIONE_TEXT_MAX_HEIGHT}
                      readOnly={ro}
                      value={r.lavorazioniEffettuate}
                      onChange={(v) => patchRiga(r.id, (row) => ({ ...row, lavorazioniEffettuate: v }))}
                    />
                  </CaptureSheetAwareField>
                </div>
              </div>
            );
          })}
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
                      <SchedaLavorazioniEffettuateTextarea
                        className="!py-2 !text-sm w-full max-w-none leading-relaxed"
                        size="sm"
                        maxHeight="min(28dvh, 8rem)"
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
