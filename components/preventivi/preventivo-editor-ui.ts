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
  dsShellNavIconBtn,
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

/** @deprecated Segmenti U.M. — usa `RicambioUnitaMisuraPicker`. */
export const preventivoEditorUmPickerShell =
  "overflow-hidden rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_90%,var(--cab-border))] bg-[var(--cab-surface)] shadow-[var(--cab-shadow-sm)]";

/** Griglia righe addetto manodopera — addetto | X | ore | costo | prezzo | margine (footer). */
export const preventivoEditorManodoperaRowGrid =
  "grid grid-cols-[minmax(9.5rem,36%)_2.25rem_minmax(4.5rem,1fr)_minmax(4.5rem,1fr)_minmax(4.5rem,1fr)_minmax(4.5rem,1fr)] items-center gap-2";

/** Colonna addetto — cap larghezza pill (≈ −30% vs 1fr pieno). */
export const preventivoEditorManodoperaAddettoCol = "min-w-0 max-w-full";

/** Colonna X — spacer header/footer (no sr-only: esce dal flusso grid). */
export const preventivoEditorManodoperaActionsCol = "block w-[2.25rem] shrink-0";

export const preventivoEditorManodoperaTableWrap = "min-w-0 overflow-x-auto";

export const preventivoEditorManodoperaHeaderCell = `min-w-0 truncate text-left ${preventivoEditorTableHeader}`;

export const preventivoEditorManodoperaNumHeaderCell =
  `${preventivoEditorTableHeader} w-full text-center whitespace-nowrap`;

export const preventivoEditorManodoperaNumCell = "min-w-0 w-full max-w-full";

/** Campo ore con segmento scheda (sola lettura) dentro il bordo input. */
export const preventivoEditorManodoperaOreFieldWrap =
  "flex w-full min-h-10 items-stretch overflow-hidden rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_90%,var(--cab-border))] bg-[var(--cab-surface)] shadow-[var(--cab-shadow-sm)] transition-[border-color,box-shadow] duration-200 focus-within:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] focus-within:ring-2 focus-within:ring-[color:color-mix(in_srgb,var(--cab-primary)_26%,transparent)]";

export const preventivoEditorManodoperaSchedaOreInside =
  "flex shrink-0 items-center justify-center self-stretch border-r border-dashed border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,var(--cab-surface))] px-1.5 text-[9px] font-semibold uppercase leading-none tracking-wide tabular-nums text-[color:var(--cab-text-muted)] whitespace-nowrap";

export const preventivoEditorManodoperaOreFieldInputInner =
  `${dsInputNoSpinner} min-h-10 min-w-0 flex-1 !border-0 bg-transparent py-2 text-sm text-center tabular-nums !shadow-none rounded-none hover:!border-transparent focus:!border-transparent focus:!ring-0 focus-visible:!ring-0 focus-visible:!ring-offset-0`;

export const preventivoEditorManodoperaFooterMetricCell =
  "flex min-w-0 w-full flex-col items-center justify-center gap-0.5 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface)] px-1.5 py-1.5 text-center shadow-[var(--cab-shadow-sm)]";

export const preventivoEditorManodoperaFooterMetricLabel =
  `whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)] leading-none`;

export const preventivoEditorManodoperaFooterMetricValue =
  "text-sm font-semibold tabular-nums leading-tight text-[color:var(--cab-text)]";

/** Riga KPI / footer manodopera — stessa griglia colonne delle righe addetto. */
export const preventivoEditorManodoperaKpiRow =
  `${preventivoEditorManodoperaRowGrid} border-b border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_50%,var(--cab-card))] px-3 py-2.5`;

/** Riga sanificazione/collaudo — stessa griglia colonne delle righe addetto. */
export const preventivoEditorManodoperaVoceRow =
  `${preventivoEditorManodoperaRowGrid} px-3 py-2.5`;

/** Input descrizione voce manodopera (sanificazione / collaudo). */
export const preventivoEditorVoceDescInput = `${preventivoEditorTableInput} min-h-10 w-full font-medium`;

/** Griglia righe ricambi — cod | desc | qtà+u.m. | costo | prezzo | markup | sconto | totale | X. */
export const preventivoEditorRicambiRowGrid =
  "grid grid-cols-[minmax(5.25rem,0.75fr)_minmax(8rem,1.45fr)_minmax(7.75rem,0.95fr)_4.25rem_4.5rem_3.5rem_3.75rem_5rem_2.25rem] items-center gap-2";

/** Qtà + U.M. in un campo (input numerico + segmenti). */
export const preventivoEditorRicambiQtyUmWrap = preventivoEditorManodoperaOreFieldWrap;

export const preventivoEditorRicambiQtyUmInput = preventivoEditorManodoperaOreFieldInputInner;

export const preventivoEditorRicambiTableWrap = "min-w-0 overflow-x-auto";

export const preventivoEditorRicambiKpiRow =
  `${preventivoEditorRicambiRowGrid} border-t border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_50%,var(--cab-card))] px-3 py-2.5`;

export const preventivoEditorRicambiMarkupReadout =
  "flex h-10 w-full min-w-0 items-center justify-center rounded-[var(--ds-radius-lg)] border border-dashed border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,var(--cab-surface))] px-1 text-[10px] font-semibold tabular-nums leading-none text-[color:var(--cab-text-muted)]";

export const preventivoEditorRicambiTotaleCell =
  `${preventivoEditorManodoperaFooterMetricValue} block w-full text-center`;

export const preventivoEditorKpiInlineGroup = "flex min-w-0 flex-nowrap items-center gap-2";

export const preventivoEditorKpiMetricCell = "flex min-w-0 flex-col items-end gap-0.5 text-right";

export const preventivoEditorKpiInput = `${preventivoEditorTableInputNumber} h-9 min-h-9 !w-[4.5rem] max-w-[4.5rem] shrink-0 py-1.5`;

/** Shell pannello interno — radius lg unico. */
export const preventivoEditorPanelClass =
  "overflow-hidden rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_38%,var(--cab-card))]";

/** CTA secondarie nel body del modale (Aggiungi riga, Rigenera, DDT). */
export const preventivoEditorActionBtn = dsBtnNeutralForm;

/** CTA in-tabella per aggiungere una riga (dashed full-width — tabelle ricambi). */
export const preventivoEditorAddRowBtn = `inline-flex w-full min-h-10 items-center justify-center gap-2 rounded-[var(--ds-radius-lg)] border border-dashed border-[color:var(--cab-border)] bg-[var(--cab-surface)] px-3 py-2 text-xs font-semibold text-[color:var(--cab-text-muted)] shadow-[var(--cab-shadow-sm)] transition-colors hover:border-[color:var(--cab-border-strong)] hover:bg-[var(--cab-hover)] hover:text-[color:var(--cab-text)] ${dsFocus}`;

/** CTA inline (es. Aggiungi addetto in manodopera). */
export const preventivoEditorAddInlineBtn = `inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface)] px-3 py-2 text-xs font-semibold text-[color:var(--cab-text)] shadow-[var(--cab-shadow-sm)] transition-colors hover:bg-[var(--cab-hover)] ${dsFocus}`;

/** Aggiungi addetto — CTA visibile, non stretch nella colonna addetto. */
export const preventivoEditorManodoperaAddBtn = `${preventivoEditorAddInlineBtn} min-h-10 justify-self-start w-auto max-w-full whitespace-nowrap border-[color:color-mix(in_srgb,var(--cab-primary)_50%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-surface))] text-[color:var(--cab-text)] hover:border-[color:color-mix(in_srgb,var(--cab-primary)_65%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_22%,var(--cab-surface))]`;

/** Aggiungi riga ricambio — span codice + descrizione per label completa. */
export const preventivoEditorRicambiAddBtn =
  `${preventivoEditorManodoperaAddBtn} col-span-2 max-w-none`;


/** Rimuovi riga/addetto — X ghost come schede lavorazione/ricambi. */
export const preventivoEditorRowRemoveBtn = `${dsShellNavIconBtn} !h-9 !w-9 text-[color:color-mix(in_srgb,var(--cab-danger)_75%,var(--cab-text))] hover:text-[color:var(--cab-danger)]`;

/** Footer modale — bottoni full-width mobile. */
/** @deprecated Usare `GestionaleModalFooterCancelButton` / `GestionaleModalFooterSaveButton`. */
export const preventivoEditorFooterBtnNeutral = `${dsBtnNeutral} min-h-11 w-full sm:w-auto`;
/** @deprecated Usare `GestionaleModalFooterSaveButton`. */
export const preventivoEditorFooterBtnPrimary = `${dsBtnPrimary} min-h-11 w-full sm:w-auto`;

// ponytail: segmented (tipo documento, U.M.) restano dsSegmented* — controlli, non CTA
