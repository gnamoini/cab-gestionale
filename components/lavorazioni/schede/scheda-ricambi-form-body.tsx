"use client";

import { useMemo, useRef, useState } from "react";
import { CaptureRicambioCodiceField } from "@/components/document-capture/capture-ricambio-codice-field";
import { RicambioMagazzinoInlineHint } from "@/components/document-capture/ricambio-magazzino-inline-hint";
import {
  CaptureSheetAwareField,
  CaptureSheetFieldHintInline,
  CaptureSheetHintsBanner,
} from "@/components/document-capture/capture-sheet-field-hint";
import { CaptureSheetLavorazioneIdentBanner } from "@/components/document-capture/capture-sheet-lavorazione-ident-banner";
import type { LavorazioneAssignRowParts } from "@/lib/document-capture/capture-manual-assign-state";
import type { MezzoIdentificazioneParts } from "@/lib/mezzi/identificazione-mezzo";
import { backfillAddettoIdFromLegacyString } from "@/lib/schede/schede-addetto-id-migrate";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { GlobalTableHead, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import type { SchedaRicambiFormOpts } from "@/components/lavorazioni/schede/scheda-fields-types";
import type { CaptureSheetRowHint } from "@/components/lavorazioni/schede/scheda-fields-types";
import { SchedaDayField, SchedaMezzoIdentificazioneReadonly, todayItDate } from "@/components/lavorazioni/schede/scheda-form-utils";
import { GestionaleQuantityField } from "@/components/gestionale/gestionale-quantity-field";
import { GestionaleTextarea } from "@/components/gestionale/gestionale-textarea";
import { RicambioRowAutocompletePortal } from "@/lib/selector-core/legacy-selector-adapters";
import { newRigaId } from "@/lib/schede/schede-ui";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { ricambioCodiceForUi } from "@/lib/magazzino/ricambio-codice";
import { formatRicambioDescrizioneForUi } from "@/lib/magazzino/ricambio-descrizione-display";
import { IconActionButton } from "@/components/design-system";
import { ShellNavIconClose } from "@/components/design-system/shell-nav-icons";
import { HubIconDownload, HubIconPlus } from "@/components/design-system/hub-table-action-icons";
import { preventivoEditorAddRowBtn } from "@/components/preventivi/preventivo-editor-ui";
import {
  dsBadgeOk,
  dsBtnNeutral,
  dsInput,
  dsShellNavIconBtn,
  dsTable,
  dsTableRow,
  dsTableWrap,
  dsScrollbar,
  gestionaleTextareaMaxHeightCompact,
} from "@/lib/ui/design-system";
import type { RigaRicambioScheda, SchedaRicambiFields } from "@/types/schede";

const RICAMBIO_CODICE_INPUT = `${dsInput} min-h-10 w-[7.5rem] shrink-0`;
const RICAMBIO_DATE_INPUT = `${dsInput} min-h-10 w-[9.5rem] shrink-0`;
const RICAMBIO_QTY_INPUT = `${dsInput} min-h-10 w-[5.5rem] shrink-0 tabular-nums`;
const RICAMBIO_DESCRIZIONE_INPUT = `${dsInput} min-h-10 w-full min-w-0 resize-none overflow-hidden leading-snug`;
const RIC_ROW_REMOVE_BTN = `${dsShellNavIconBtn} !h-9 !w-9 text-[color:color-mix(in_srgb,var(--cab-danger)_75%,var(--cab-text))] hover:text-[color:var(--cab-danger)]`;
const RIC_SCARICA_BTN = `${dsBtnNeutral} inline-flex h-10 min-h-10 shrink-0 items-center justify-center whitespace-nowrap px-3 text-xs font-semibold`;

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

function RicambioDescrizioneField({
  value,
  onChange,
  readOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}) {
  if (readOnly) {
    return <span className="text-sm leading-snug text-[color:var(--cab-text)]">{value || "—"}</span>;
  }

  return (
    <GestionaleTextarea
      className={RICAMBIO_DESCRIZIONE_INPUT}
      size="sm"
      rows={1}
      maxHeight={gestionaleTextareaMaxHeightCompact}
      autoComplete="off"
      value={value}
      onChange={onChange}
      placeholder="Descrizione ricambio"
      aria-label="Descrizione ricambio"
    />
  );
}

function RicambiRigaRow({
  r,
  rowNum,
  ro,
  prodotti,
  rowHints,
  isCapture,
  hubAutocomplete,
  acRowId,
  setAcRowId,
  onPatch,
  onRemove,
  onScaricaMagazzino,
}: {
  r: RigaRicambioScheda;
  rowNum: number;
  ro: boolean;
  prodotti: readonly RicambioMagazzino[];
  rowHints?: Record<string, CaptureSheetRowHint>;
  isCapture: boolean;
  hubAutocomplete: boolean;
  acRowId: string | null;
  setAcRowId: (id: string | null) => void;
  onPatch: (patch: Partial<RigaRicambioScheda>) => void;
  onRemove: () => void;
  onScaricaMagazzino?: (row: RigaRicambioScheda) => void | Promise<void>;
}) {
  const [pendingMag, setPendingMag] = useState<RicambioMagazzino | null>(null);
  const [dismissedMagId, setDismissedMagId] = useState<string | null>(null);

  const codiceKey = `riga_${rowNum}_codice`;
  const descrizioneKey = `riga_${rowNum}_descrizione`;
  const nomeKey = `riga_${rowNum}_nome`;
  const dataKey = `riga_${rowNum}_data`;
  const sug = !ro && !hubAutocomplete && acRowId === r.id ? suggestionsForRow(r, prodotti) : [];

  const fieldHintFooter = (key: string, hint?: CaptureSheetRowHint) =>
    hint?.message ? <CaptureSheetFieldHintInline fieldKey={key} hint={hint} embedded /> : undefined;

  const showMagHint = pendingMag && pendingMag.id !== dismissedMagId && pendingMag.id !== r.ricambioId;

  return (
    <>
      <tr className={dsTableRow} data-ricambi-ac-open={acRowId === r.id ? "1" : undefined}>
        <td className="px-2 py-2 align-middle">
          <CaptureSheetAwareField hint={rowHints?.[codiceKey]} footer={fieldHintFooter(codiceKey, rowHints?.[codiceKey])}>
            {ro ? (
              <span className="text-sm text-[color:var(--cab-text)]">{r.codice || "—"}</span>
            ) : (
              <CaptureRicambioCodiceField
                value={r.codice}
                magazzino={prodotti}
                readOnly={ro}
                inputClassName={RICAMBIO_CODICE_INPUT}
                onChange={(v) => {
                  onPatch({ codice: v, ricambioId: null });
                  setPendingMag(null);
                  if (!hubAutocomplete) setAcRowId(r.id);
                }}
                onPick={(item, codiceUi) => {
                  onPatch({ ...applyRicambioFromMagazzino(r, item), codice: codiceUi });
                  setPendingMag(null);
                }}
                onBlurExactMatch={(item) => {
                  if (dismissedMagId === item.id || r.ricambioId === item.id) return;
                  setPendingMag(item);
                }}
              />
            )}
          </CaptureSheetAwareField>
        </td>
        <td className="px-2 py-2 align-middle">
          <CaptureSheetAwareField
            hint={rowHints?.[nomeKey] ?? rowHints?.[descrizioneKey]}
            footer={fieldHintFooter(nomeKey, rowHints?.[nomeKey] ?? rowHints?.[descrizioneKey])}
          >
            {ro ? (
              <span className="text-sm text-[color:var(--cab-text)]">{r.ricambioNome || "—"}</span>
            ) : hubAutocomplete ? (
              <RicambioRowAutocompletePortal
                value={r.ricambioNome}
                onChange={(v) => {
                  onPatch({ ricambioNome: v });
                  setAcRowId(r.id);
                }}
                open={acRowId === r.id}
                onOpenChange={(next) => setAcRowId(next ? r.id : null)}
                suggestions={suggestionsForRow(r, prodotti).map((p) => ({
                  id: p.id,
                  descrizione: p.descrizione ?? "",
                  marca: p.marca ?? "",
                  codiceFornitoreOriginale: ricambioCodiceForUi(p.codiceFornitoreOriginale),
                }))}
                onSelect={(p) => {
                  onPatch({
                    ricambioId: p.id,
                    ricambioNome: p.descrizione,
                    codice: ricambioCodiceForUi(p.codiceFornitoreOriginale),
                  });
                  setAcRowId(null);
                }}
              />
            ) : (
              <div className="space-y-1">
                <RicambioDescrizioneField value={r.ricambioNome} onChange={(v) => onPatch({ ricambioNome: v })} />
                {sug.length > 0 ? (
                  <ul className="max-h-32 space-y-0.5 overflow-y-auto rounded border border-[color:var(--cab-border)] bg-[var(--cab-card)] p-1">
                    {sug.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-[var(--cab-surface-2)]"
                          onClick={() => {
                            onPatch(applyRicambioFromMagazzino(r, p));
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
        <td className="px-2 py-2 align-middle">
          <GestionaleQuantityField
            className={RICAMBIO_QTY_INPUT}
            readOnly={ro}
            value={r.quantita}
            aria-label="Quantità"
            onCommit={(quantita) => onPatch({ quantita })}
          />
        </td>
        <td className="px-2 py-2 align-middle">
          {ro ? (
            <span className="text-sm text-[color:var(--cab-text)]">{r.dataUtilizzo || "—"}</span>
          ) : (
            <CaptureSheetAwareField hint={isCapture ? rowHints?.[dataKey] : undefined} footer={isCapture ? fieldHintFooter(dataKey, rowHints?.[dataKey]) : undefined}>
              <SchedaDayField
                label="Data"
                showLabel={false}
                showTodayButton={false}
                className="w-[9.5rem] shrink-0"
                inputClassName={RICAMBIO_DATE_INPUT}
                value={r.dataUtilizzo}
                onChange={(v) => onPatch({ dataUtilizzo: v })}
              />
            </CaptureSheetAwareField>
          )}
        </td>
        {!ro && (onScaricaMagazzino || isCapture) ? (
          <td className="px-2 py-2 text-center align-middle">
            {onScaricaMagazzino ? (
              <div className="flex min-h-10 items-center justify-center gap-2">
                <button
                  type="button"
                  className={RIC_SCARICA_BTN}
                  disabled={!r.ricambioId || Boolean(r.scaricoMagazzinoApplicato)}
                  onClick={() => void onScaricaMagazzino(r)}
                >
                  <HubIconDownload className="h-4 w-4 shrink-0" />
                  Scarica
                </button>
                {r.scaricoMagazzinoApplicato ? <span className={`${dsBadgeOk} shrink-0`}>Scaricato</span> : null}
              </div>
            ) : r.ricambioId ? (
              <label className="flex min-h-10 cursor-pointer items-center justify-center gap-2 text-sm text-[color:var(--cab-text-muted)]">
                <input
                  type="checkbox"
                  className="rounded border-[color:var(--cab-border)]"
                  checked={Boolean(r.scaricoMagazzinoRichiesto)}
                  disabled={Boolean(r.scaricoMagazzinoApplicato)}
                  onChange={(e) => onPatch({ scaricoMagazzinoRichiesto: e.target.checked })}
                />
                Scarica
              </label>
            ) : (
              <span className="text-[color:var(--cab-text-muted)]">—</span>
            )}
          </td>
        ) : null}
        {!ro ? (
          <td className="px-2 py-2 align-middle">
            <div className="flex min-h-10 items-center justify-end">
              <IconActionButton
                type="button"
                label="Rimuovi riga ricambio"
                className={RIC_ROW_REMOVE_BTN}
                onClick={onRemove}
              >
                <ShellNavIconClose dense className="h-5 w-5" />
              </IconActionButton>
            </div>
          </td>
        ) : null}
      </tr>
      {showMagHint ? (
        <tr>
          <td colSpan={onScaricaMagazzino || isCapture ? 6 : 5} className="px-2 pb-2">
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
          </td>
        </tr>
      ) : null}
    </>
  );
}

export type SchedaRicambiFormBodyProps = {
  value: SchedaRicambiFields;
  onChange: (fields: SchedaRicambiFields) => void;
  readonly?: boolean;
  globalOpts: SchedaRicambiFormOpts;
  rowHints?: Record<string, CaptureSheetRowHint>;
  reviewCount?: number;
  variant?: "editor" | "capture";
  captureIdentParts?: LavorazioneAssignRowParts | null;
  /** Parti strutturate mezzo (hub) — identificazione read-only. */
  identParts?: MezzoIdentificazioneParts | null;
  hubAutocomplete?: boolean;
  onScaricaMagazzino?: (row: RigaRicambioScheda) => void | Promise<void>;
  confirmDestructive?: (opts: {
    title: string;
    message: string;
    confirmLabel?: string;
  }) => Promise<boolean>;
};

export function SchedaRicambiFormBody({
  value,
  onChange,
  readonly = false,
  globalOpts,
  rowHints,
  reviewCount = 0,
  variant = "editor",
  captureIdentParts = null,
  identParts = null,
  hubAutocomplete = false,
  onScaricaMagazzino,
  confirmDestructive,
}: SchedaRicambiFormBodyProps) {
  const ro = readonly;
  const prodotti = globalOpts.magazzino ?? [];
  const [acRowId, setAcRowId] = useState<string | null>(null);
  const isCapture = variant === "capture";
  const global = useGlobalOptions({ enabled: !ro });

  const defaultAddettoId =
    backfillAddettoIdFromLegacyString(global.lavorazioni.addettiRecords, globalOpts.defaultAddetto) || "";

  const identLine = useMemo(
    () => value.identificazioneMacchina.trim() || "—",
    [value.identificazioneMacchina],
  );

  function patchRighe(righe: RigaRicambioScheda[]) {
    onChange({ ...value, righe });
  }

  function newEmptyRiga(): RigaRicambioScheda {
    return {
      id: newRigaId(),
      ricambioId: null,
      ricambioNome: "",
      codice: "",
      quantita: 1,
      addettoId: defaultAddettoId || null,
      addetto: globalOpts.defaultAddetto ?? "",
      dataUtilizzo: todayItDate(),
    };
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

  const showMagazzinoCol = !ro && (Boolean(onScaricaMagazzino) || isCapture);

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
            <GlobalTableHeadLabel label="Codice" thClassName="w-[7.5rem] max-w-[7.5rem]" />
            <GlobalTableHeadLabel label="Descrizione ricambio" thClassName="min-w-[18rem]" />
            <GlobalTableHeadLabel label="Qtà" thClassName="w-[5.5rem]" />
            <GlobalTableHeadLabel label="Data" thClassName="w-[9.5rem] max-w-[9.5rem]" />
            {showMagazzinoCol ? (
              <GlobalTableHeadLabel label="Magazzino" align="center" thClassName="min-w-[6.5rem]" />
            ) : null}
            {!ro ? <GlobalTableHeadLabel label="" thClassName="w-12" /> : null}
          </GlobalTableHead>
          <tbody>
            {value.righe.map((r, rowIdx) => (
              <RicambiRigaRow
                key={r.id}
                r={r}
                rowNum={rowIdx + 1}
                ro={ro}
                prodotti={prodotti}
                rowHints={rowHints}
                isCapture={isCapture}
                hubAutocomplete={hubAutocomplete}
                acRowId={acRowId}
                setAcRowId={setAcRowId}
                onPatch={(patch) => patchRighe(value.righe.map((x) => (x.id === r.id ? { ...x, ...patch } : x)))}
                onRemove={() => void removeRiga(r.id)}
                onScaricaMagazzino={onScaricaMagazzino}
              />
            ))}
          </tbody>
        </table>
      </div>
      {!ro ? (
        <button type="button" className={preventivoEditorAddRowBtn} onClick={() => patchRighe([...value.righe, newEmptyRiga()])}>
          <HubIconPlus className="h-4 w-4 shrink-0" aria-hidden />
          Aggiungi riga ricambio
        </button>
      ) : null}
    </div>
  );
}
