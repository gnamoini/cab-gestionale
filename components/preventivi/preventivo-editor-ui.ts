/**
 * SSOT tipografia, shell, bottoni del modal preventivo.
 *
 * Gerarchia:
 * - L1: titolo sezione collapsible → `dsCardTitle` (GestionaleCollapsibleSection)
 * - L2: sotto-sezione nel body → `preventivoEditorSubsectionTitle`
 * - L3: label campo → FormField / gestionaleFieldLabelClass
 * - L4: hint / caption → `preventivoEditorHint`
 * - L5: body / valore → `preventivoEditorBody`, importi → `preventivoEditorMoneyValue`
 */
import {
  dsBtnNeutral,
  dsBtnNeutralForm,
  dsBtnPrimary,
  dsFocus,
  dsInput,
  dsInputNoSpinner,
  dsLabel,
  cabPrimaryBg,
  dsTypoBody,
  dsTypoCaption,
  dsTypoTableHeader,
} from "@/lib/ui/design-system";

/** L2 — titolo sotto-sezione nel corpo del modale. */
export const preventivoEditorSubsectionTitle =
  "text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)]";

/** @deprecated alias — usare `preventivoEditorSubsectionTitle` */
export const preventivoEditorSubsectionTitleClass = preventivoEditorSubsectionTitle;

/** L4 — hint, caption, meta testo secondario. */
export const preventivoEditorHint = dsTypoCaption;

/** L5 — testo body / descrizione riga. */
export const preventivoEditorBody = dsTypoBody;

/** L5 — importi monetari (KPI, totali riga). */
export const preventivoEditorMoneyValue =
  "text-base font-semibold tabular-nums text-[color:var(--cab-text)]";

export const preventivoEditorMoneyValueSm =
  "text-sm font-semibold tabular-nums text-[color:var(--cab-text)]";

/** L3 read-only — etichetta KPI sopra valore (stesso stile FormField). */
export const preventivoEditorKpiLabel = `min-w-0 ${dsLabel}`;

/** Header riga tabella manodopera (allineato a GlobalTableHeadLabel). */
export const preventivoEditorTableHeader = dsTypoTableHeader;

/** Cella tabella densa nel modale. */
export const preventivoEditorTableTdClass = "px-2 py-1 align-middle";

/** Input compatto per celle tabella ricambi/manodopera. */
export const preventivoEditorTableInput = `${dsInput} min-h-10 py-2 text-sm`;

export const preventivoEditorTableInputNumber = `${preventivoEditorTableInput} ${dsInputNoSpinner} text-right tabular-nums`;

/** Segment U.M. in tabella — 3 segmenti collegati, stessa altezza degli input. */
export const preventivoEditorUmSegmentWrap = `grid w-full min-w-[7.25rem] grid-cols-3 divide-x divide-[color:var(--cab-border)] overflow-hidden rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_90%,var(--cab-border))] bg-[var(--cab-surface)] shadow-[var(--cab-shadow-sm)]`;

export const preventivoEditorUmSegmentOn = `inline-flex h-10 min-w-0 items-center justify-center ${cabPrimaryBg} text-xs font-semibold text-white transition-colors`;

export const preventivoEditorUmSegmentOff = `inline-flex h-10 min-w-0 items-center justify-center text-xs font-semibold text-[color:var(--cab-text-muted)] transition-colors hover:bg-[var(--cab-hover)] hover:text-[color:var(--cab-text)]`;

/** Riga KPI manodopera — stessa griglia colonne delle righe addetto. */
export const preventivoEditorManodoperaKpiRow =
  "grid grid-cols-1 gap-y-2 border-b border-[color:var(--cab-border)] px-3 py-2 sm:grid-cols-[minmax(0,1fr)_6.5rem_minmax(8.5rem,auto)] sm:items-center sm:gap-3";

export const preventivoEditorKpiInlineGroup = "flex min-w-0 flex-nowrap items-center gap-2";

export const preventivoEditorKpiMetricCell = "flex min-w-0 flex-col items-end gap-0.5 text-right";

export const preventivoEditorKpiInput = `${preventivoEditorTableInputNumber} h-9 min-h-9 !w-[4.5rem] max-w-[4.5rem] shrink-0 py-1.5`;

/** Shell pannello interno — radius lg unico. */
export const preventivoEditorPanelClass =
  "overflow-hidden rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_38%,var(--cab-card))]";

/** CTA secondarie nel body del modale (Aggiungi riga, Rigenera, DDT). */
export const preventivoEditorActionBtn = dsBtnNeutralForm;

/** CTA in-tabella per aggiungere una riga (dashed, full-width). */
export const preventivoEditorAddRowBtn = `inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-[var(--ds-radius-lg)] border border-dashed border-[color:color-mix(in_srgb,var(--cab-primary)_32%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_7%,var(--cab-card))] px-3 py-2.5 text-xs font-semibold text-[color:color-mix(in_srgb,var(--cab-primary)_90%,var(--cab-text))] shadow-[var(--cab-shadow-sm)] transition-colors hover:border-[color:color-mix(in_srgb,var(--cab-primary)_48%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-card))] ${dsFocus}`;

/** Footer modale — bottoni full-width mobile. */
/** @deprecated Usare `GestionaleModalFooterCancelButton` / `GestionaleModalFooterSaveButton`. */
export const preventivoEditorFooterBtnNeutral = `${dsBtnNeutral} min-h-11 w-full sm:w-auto`;
/** @deprecated Usare `GestionaleModalFooterSaveButton`. */
export const preventivoEditorFooterBtnPrimary = `${dsBtnPrimary} min-h-11 w-full sm:w-auto`;

// ponytail: segmented (tipo documento, U.M.) restano dsSegmented* — controlli, non CTA
