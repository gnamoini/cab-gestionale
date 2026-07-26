"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CaptureRicambioCodiceField } from "@/components/document-capture/capture-ricambio-codice-field";
import { RicambioMagazzinoInlineHint } from "@/components/document-capture/ricambio-magazzino-inline-hint";
import {
  CaptureSheetAwareField,
  CaptureSheetFieldHintInline,
  CaptureSheetHintsBanner,
} from "@/components/document-capture/capture-sheet-field-hint";
import { CaptureSheetLavorazioneIdentBanner } from "@/components/document-capture/capture-sheet-lavorazione-ident-banner";
import type { LavorazioneAssignRowParts } from "@/lib/document-capture/capture-manual-assign-state";
import { AddettoPicker, AddettoDisplayPill, addettoRefFromFields } from "@/components/domain/addetti";
import { SCHEDA_RIGA_ADDETTO_WRITE_RULES, stripAddettoLegacyFieldsOnWrite } from "@/lib/lavorazioni/addetto-write-freeze";
import { backfillAddettoIdFromLegacyString } from "@/lib/schede/schede-addetto-id-migrate";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { GlobalTableHead, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import type { SchedaRicambiFormOpts } from "@/components/lavorazioni/schede/scheda-fields-types";
import type { CaptureSheetRowHint } from "@/components/lavorazioni/schede/scheda-fields-types";
import { SchedaDayField, SchedaOreNumberInput, todayItDate } from "@/components/lavorazioni/schede/scheda-form-utils";
import { GestionaleQuantityField } from "@/components/gestionale/gestionale-quantity-field";
import { newRigaId } from "@/lib/schede/schede-ui";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { ricambioCodiceForUi } from "@/lib/magazzino/ricambio-codice";
import { formatRicambioDescrizioneForUi } from "@/lib/magazzino/ricambio-descrizione-display";
import { dsBtnNeutral, dsFormField, dsInput, dsTable, dsTableRow, dsTableWrap, dsScrollbar } from "@/lib/ui/design-system";
import { gestionaleFieldLabelClass } from "@/lib/ui/gestionale-field-label";
import type { RigaRicambioScheda, SchedaRicambiFields } from "@/types/schede";

function writeSchedaRicambioAddetto(row: RigaRicambioScheda, addettoId: string): RigaRicambioScheda {
  const id = addettoId.trim();
  return stripAddettoLegacyFieldsOnWrite(
    { ...row, addettoId: id || null, addetto: "" },
    SCHEDA_RIGA_ADDETTO_WRITE_RULES,
  ) as RigaRicambioScheda;
}

export type SchedaRicambiFormBodyProps = {
  value: SchedaRicambiFields;
  onChange: (fields: SchedaRicambiFields) => void;
  readonly?: boolean;
  globalOpts: SchedaRicambiFormOpts;
  rowHints?: Record<string, CaptureSheetRowHint>;
  reviewCount?: number;
  variant?: "editor" | "capture";
  /** Banner read-only cliente/cantiere/mezzo quando la scheda è collegata a una lavorazione. */
  captureIdentParts?: LavorazioneAssignRowParts | null;
};

const CAPTURE_CODICE_W = "w-full min-w-0 sm:w-[9.5rem] sm:shrink-0";
const CAPTURE_QTY_W = "w-[5.5rem] shrink-0";
const CAPTURE_DESCRIZIONE_W = "min-w-0 flex-1 basis-[10rem]";
const CAPTURE_DATE_W = "w-full min-w-0 sm:w-[11rem] sm:shrink-0";
const CAPTURE_ADDETTO_W = "min-w-0 flex-1 basis-[8rem]";
const CAPTURE_FIELD_STACK = `${dsFormField} min-w-0`;
const CAPTURE_DESCRIZIONE_INPUT = `${dsInput} w-full min-w-0 resize-none overflow-hidden leading-snug py-1.5`;

function CaptureRicambiFieldLabel({ children }: { children: string }) {
  return <span className={gestionaleFieldLabelClass}>{children}</span>;
}

function CaptureRicambioDescrizioneField({
  value,
  onChange,
  readOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const syncHeight = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    const styles = getComputedStyle(el);
    const lineHeight = Number.parseFloat(styles.lineHeight) || 20;
    const padding =
      Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);
    const border =
      Number.parseFloat(styles.borderTopWidth) + Number.parseFloat(styles.borderBottomWidth);
    const singleLine = lineHeight + padding + border;
    const maxHeight = singleLine * 2;
    el.style.height = `${Math.min(Math.max(el.scrollHeight, singleLine), maxHeight)}px`;
  }, []);

  useLayoutEffect(() => {
    syncHeight();
  }, [value, syncHeight]);

  if (readOnly) {
    return <span className="text-sm leading-snug text-[color:var(--cab-fg)]">{value || "—"}</span>;
  }

  return (
    <textarea
      ref={ref}
      className={CAPTURE_DESCRIZIONE_INPUT}
      rows={1}
      spellCheck={false}
      autoComplete="off"
      autoCorrect="off"
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        syncHeight();
      }}
      placeholder="Descrizione ricambio"
      aria-label="Descrizione ricambio"
    />
  );
}

function applyRicambioFromMagazzino(row: RigaRicambioScheda, item: RicambioMagazzino): RigaRicambioScheda {
  const codice = ricambioCodiceForUi(item.codiceFornitoreOriginale);
  const descrizione = formatRicambioDescrizioneForUi(item.descrizione ?? "");
  return {
    ...row,
    ricambioId: item.id,
    codice: codice || row.codice,
    ricambioNome: row.ricambioNome.trim() || descrizione || row.ricambioNome,
  };
}

function CaptureRicambiRigaCard({
  r,
  rowNum,
  ro,
  prodotti,
  rowHints,
  onPatch,
  onRemove,
}: {
  r: RigaRicambioScheda;
  rowNum: number;
  ro: boolean;
  prodotti: readonly RicambioMagazzino[];
  rowHints?: Record<string, CaptureSheetRowHint>;
  onPatch: (patch: Partial<RigaRicambioScheda>) => void;
  onRemove: () => void;
}) {
  const global = useGlobalOptions({ enabled: !ro });
  const addettoPickerId =
    r.addettoId?.trim() ||
    backfillAddettoIdFromLegacyString(global.lavorazioni.addettiRecords, r.addetto) ||
    "";

  const codiceKey = `riga_${rowNum}_codice`;
  const descrizioneKey = `riga_${rowNum}_descrizione`;
  const nomeKey = `riga_${rowNum}_nome`;
  const dataKey = `riga_${rowNum}_data`;
  const [pendingMag, setPendingMag] = useState<RicambioMagazzino | null>(null);
  const [dismissedMagId, setDismissedMagId] = useState<string | null>(null);

  const codiceHint = rowHints?.[codiceKey];
  const descrizioneHint = rowHints?.[descrizioneKey];
  const nomeHint = rowHints?.[nomeKey];
  const dataHint = rowHints?.[dataKey];

  const rowMetaHintFooter = (key: string, hint?: CaptureSheetRowHint) =>
    hint?.message ? <CaptureSheetFieldHintInline fieldKey={key} hint={hint} embedded /> : undefined;

  const handleExactMatch = (item: RicambioMagazzino) => {
    if (dismissedMagId === item.id || r.ricambioId === item.id) return;
    setPendingMag(item);
  };

  const showMagHint =
    pendingMag && pendingMag.id !== dismissedMagId && pendingMag.id !== r.ricambioId;

  return (
    <div className="min-w-0 overflow-x-hidden rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:var(--cab-surface)]">
      <div className="flex flex-col gap-2 p-2.5">
        <div className="flex w-full min-w-0 flex-wrap items-start gap-2">
          <div className={`${CAPTURE_FIELD_STACK} ${CAPTURE_CODICE_W}`}>
            <CaptureRicambiFieldLabel>Codice</CaptureRicambiFieldLabel>
            <CaptureSheetAwareField hint={codiceHint}>
              <CaptureRicambioCodiceField
                value={r.codice}
                magazzino={prodotti}
                readOnly={ro}
                inputClassName={`${dsInput} w-full min-w-0`}
                onChange={(v) => {
                  onPatch({ codice: v, ricambioId: null });
                  setPendingMag(null);
                }}
                onPick={(item, codiceUi) => {
                  onPatch({ ...applyRicambioFromMagazzino(r, item), codice: codiceUi });
                  setPendingMag(null);
                }}
                onBlurExactMatch={handleExactMatch}
              />
            </CaptureSheetAwareField>
          </div>

          <div className={`${CAPTURE_FIELD_STACK} ${CAPTURE_DESCRIZIONE_W}`}>
            <CaptureRicambiFieldLabel>Descrizione</CaptureRicambiFieldLabel>
            <CaptureSheetAwareField hint={descrizioneHint}>
              {ro ? (
                <span className="text-sm leading-snug text-[color:var(--cab-fg)]">{r.ricambioNome || "—"}</span>
              ) : (
                <CaptureRicambioDescrizioneField
                  value={r.ricambioNome}
                  onChange={(v) => onPatch({ ricambioNome: v })}
                />
              )}
            </CaptureSheetAwareField>
          </div>

          <div className={`${CAPTURE_FIELD_STACK} ${CAPTURE_QTY_W}`}>
            <CaptureRicambiFieldLabel>Qtà</CaptureRicambiFieldLabel>
            <GestionaleQuantityField
              className={`${dsInput} w-full tabular-nums`}
              readOnly={ro}
              value={r.quantita}
              aria-label="Quantità"
              onCommit={(quantita) => onPatch({ quantita })}
            />
          </div>
          {codiceHint?.message ? (
            <span className="sr-only" data-capture-hint={codiceKey}>
              {codiceHint.message}
            </span>
          ) : null}
        </div>

        <div className="flex w-full min-w-0 flex-wrap items-start gap-2">
          <div className={`${CAPTURE_FIELD_STACK} ${CAPTURE_DATE_W}`}>
            <CaptureRicambiFieldLabel>Data</CaptureRicambiFieldLabel>
            {ro ? (
              <span className={`${dsInput} flex items-center`}>{r.dataUtilizzo || "—"}</span>
            ) : (
              <CaptureSheetAwareField hint={dataHint} footer={rowMetaHintFooter(dataKey, dataHint)}>
                <SchedaDayField
                  label="Data"
                  showLabel={false}
                  showTodayButton={false}
                  className="w-full"
                  inputClassName={dsInput}
                  value={r.dataUtilizzo}
                  onChange={(v) => onPatch({ dataUtilizzo: v })}
                />
              </CaptureSheetAwareField>
            )}
          </div>

          <div className={`${CAPTURE_FIELD_STACK} ${CAPTURE_ADDETTO_W}`}>
            <CaptureRicambiFieldLabel>Addetto</CaptureRicambiFieldLabel>
            {ro ? (
              <AddettoDisplayPill
                ref={addettoRefFromFields({ addettoId: r.addettoId, addettoLegacy: r.addetto })}
                fullWidth={false}
              />
            ) : (
              <CaptureSheetAwareField hint={nomeHint} footer={rowMetaHintFooter(nomeKey, nomeHint)}>
                <AddettoPicker
                  value={addettoPickerId || null}
                  onChange={(id) => onPatch(writeSchedaRicambioAddetto(r, id))}
                  ariaLabel="Addetto riga ricambio"
                  className="w-full min-w-0"
                />
              </CaptureSheetAwareField>
            )}
          </div>

          {r.ricambioId && !ro ? (
            <label className="flex shrink-0 cursor-pointer items-center gap-1.5 self-end pb-1 text-xs text-[color:var(--cab-text-muted)]">
              <input
                type="checkbox"
                className="rounded border-[color:var(--cab-border)]"
                checked={Boolean(r.scaricoMagazzinoRichiesto)}
                disabled={Boolean(r.scaricoMagazzinoApplicato)}
                onChange={(e) => onPatch({ scaricoMagazzinoRichiesto: e.target.checked })}
              />
              Scarica
            </label>
          ) : null}

          {!ro ? (
            <button
              type="button"
              className="ml-auto shrink-0 self-end rounded p-1.5 text-sm text-[color:var(--cab-text-muted)] transition hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
              aria-label="Rimuovi riga ricambio"
              onClick={onRemove}
            >
              ✕
            </button>
          ) : null}
        </div>
      </div>

      {showMagHint ? (
        <div className="px-2.5 pb-2">
          <RicambioMagazzinoInlineHint
            item={pendingMag}
            onUseRicambio={() => {
              onPatch(applyRicambioFromMagazzino(r, pendingMag));
              setPendingMag(null);
            }}
            onDismiss={() => {
              setDismissedMagId(pendingMag.id);
              setPendingMag(null);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

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
  captureIdentParts = null,
}: SchedaRicambiFormBodyProps) {
  const ro = readonly;
  const prodotti = globalOpts.magazzino ?? [];
  const [acRowId, setAcRowId] = useState<string | null>(null);
  const isCapture = variant === "capture";
  const global = useGlobalOptions({ enabled: !ro });

  const resolveAddettoPickerId = (r: RigaRicambioScheda) =>
    r.addettoId?.trim() ||
    backfillAddettoIdFromLegacyString(global.lavorazioni.addettiRecords, r.addetto) ||
    "";

  const defaultAddettoId =
    backfillAddettoIdFromLegacyString(global.lavorazioni.addettiRecords, globalOpts.defaultAddetto) || "";

  function patchRighe(righe: RigaRicambioScheda[]) {
    onChange({ ...value, righe });
  }

  const identLine = useMemo(
    () => value.identificazioneMacchina.trim() || "—",
    [value.identificazioneMacchina],
  );

  if (isCapture) {
    return (
      <div className="min-w-0 space-y-4 overflow-x-hidden">
        {reviewCount > 0 ? <CaptureSheetHintsBanner reviewCount={reviewCount} /> : null}
        <CaptureSheetLavorazioneIdentBanner parts={captureIdentParts} fallbackIdent={identLine} />
        <div className="min-w-0 space-y-3">
          {value.righe.map((r, rowIdx) => {
            const rowNum = rowIdx + 1;
            return (
              <CaptureRicambiRigaCard
                key={r.id}
                r={r}
                rowNum={rowNum}
                ro={ro}
                prodotti={prodotti}
                rowHints={rowHints}
                onPatch={(patch) =>
                  patchRighe(value.righe.map((x) => (x.id === r.id ? { ...x, ...patch } : x)))
                }
                onRemove={() => patchRighe(value.righe.filter((x) => x.id !== r.id))}
              />
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
                  ricambioId: null,
                  ricambioNome: "",
                  codice: "",
                  quantita: 1,
                  addettoId: defaultAddettoId,
                  addetto: "",
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
                                          x.id === r.id ? applyRicambioFromMagazzino(x, p) : x,
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
                    <GestionaleQuantityField
                      className={`${dsInput} !py-1.5 !text-xs w-20`}
                      readOnly={ro}
                      value={r.quantita}
                      onCommit={(quantita) =>
                        patchRighe(
                          value.righe.map((x) => (x.id === r.id ? { ...x, quantita } : x)),
                        )
                      }
                    />
                  </td>
                  <td className="px-2 py-2 align-top">
                    {ro ? (
                      <AddettoDisplayPill
                        ref={addettoRefFromFields({ addettoId: r.addettoId, addettoLegacy: r.addetto })}
                        fullWidth={false}
                      />
                    ) : (
                      <AddettoPicker
                        value={resolveAddettoPickerId(r) || null}
                        onChange={(id) =>
                          patchRighe(
                            value.righe.map((x) => (x.id === r.id ? writeSchedaRicambioAddetto(x, id) : x)),
                          )
                        }
                        ariaLabel="Addetto riga ricambio"
                        className="w-full min-w-[8rem]"
                        inputClassName={`${dsInput} !py-1.5 !text-xs`}
                        size="compact"
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
                addettoId: defaultAddettoId,
                addetto: "",
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
