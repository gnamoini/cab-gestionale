"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { runSubmitFromGetter, useSubmitLock } from "@/lib/forms/form-engine";
import { useDevModalLayoutLint } from "@/lib/ui-visual-linter/use-visual-layout-linter";
import { recordHealthMetric } from "@/lib/observability/runtime-health";
import type { LavorazioneAttiva, PrioritaLav, StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { addettoDisplayColor } from "@/lib/lavorazioni/addetto-colors-assign";
import { prioritaDisplayColor, statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import { isoToItDisplay } from "@/lib/lavorazioni/date-day-only";
import {
  parseItalianDayDisplayToIso,
  parseOptionalItalianDayDisplayToIso,
} from "@/lib/ui/italian-date-input-mask";
import { LavorazioniDateField } from "@/components/gestionale/lavorazioni/lavorazioni-date-field";
import { LavorazioneMezzoPicker } from "@/components/gestionale/lavorazioni/lavorazione-mezzo-picker";
import { AddettoSelectField } from "@/components/gestionale/lavorazioni/lavorazioni-inline-select";
import { GlobalFixedListPillSelect } from "@/components/gestionale/global-input";
import {
  buildAddettoTablePillOptions,
  buildPrioritaTablePillOptions,
  buildStatoTablePillOptions,
} from "@/lib/global-list/build-lavorazioni-pill-options";
import {
  AddettiSettingsSection,
  PrioritaSettingsSection,
  StatiSettingsSection,
} from "@/components/gestionale/lavorazioni/lavorazioni-settings-ui";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import {
  erpBtnAccent,
  erpBtnNeutral,
  prioritaLabel,
  addettoPillShellClass,
  addettoPillShellStyleForName,
  prioritaPillShellClass,
  prioritaPillShellStyle,
  statoPillShellClass,
  statoPillShellStyle,
} from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { gestionaleFormFocusScopeProps } from "@/components/gestionale/gestionale-form-focus-scope";
import { GestionaleTextarea } from "@/components/gestionale/gestionale-textarea";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { useGestionaleModalDialogFocus } from "@/components/gestionale/gestionale-modal-focus";
import { CloseButton } from "@/components/design-system/close-button";
import {
  dsInput,
  dsLavorazioniModalLayer,
  dsLabel,
  dsModalBackBtn,
  dsModalCloseBtn,
  dsLavorazioniModalWindowHeader,
  dsModalHeaderInner,
  dsModalHeaderLead,
  dsModalSubtitle,
  dsModalSubtitleHub,
  dsModalTitle,
  dsModalTitleBlock,
  dsModalFormFooter,
  dsHubModalTabBar,
  dsSegmentedBtnOn,
} from "@/lib/ui/design-system";
import { useBodyScrollLock } from "@/lib/ui/use-body-scroll-lock";
import { useOverlayBackHandler } from "@/lib/ui/use-overlay-back-handler";
import { orderPrioritaList } from "@/lib/lavorazioni/priorita-order";
import {
  gestionaleModalBodyFlexClass,
  resolveShellModalLayout,
  type GestionaleModalWidth,
  type ModalHeight,
  type ModalSize,
} from "@/lib/ui/modal-max-width-class";
import {
  CAB_FOCUS_SCROLL_GROUP_ATTR,
  CAB_FOCUS_SCROLL_TITLE_ATTR,
  CAB_MODAL_ROOT_ATTR,
  CAB_MODAL_SCROLL_ATTR,
  gestionaleModalScrollBodyMobileClass,
} from "@/lib/ui/mobile-modal-behavior";
import { cabModalScrollKeyboardPad } from "@/lib/ui/ios-mobile-tokens";
import { flexShrinkSafe } from "@/lib/ui/global-flex-system";
import { useMaxMdDown } from "@/lib/ui/use-max-md-down";
import { useMobileModalKeyboard } from "@/lib/ui/use-mobile-modal-keyboard";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      {...{ [CAB_FOCUS_SCROLL_TITLE_ATTR]: "" }}
      className="mb-3 text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-text)]"
    >
      {children}
    </p>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={dsLabel}>{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const PRIORITA: PrioritaLav[] = orderPrioritaList(["bassa", "media", "alta", "urgente"]) as PrioritaLav[];

const LAV_MODAL_TITLE_ID = "lav-modal-title";

function LavorazioniInterventoPillFields({
  statoId,
  onStatoChange,
  priorita,
  onPrioritaChange,
  addetto,
  onAddettoChange,
  stati,
  addetti,
  addettoColors,
  prioritaColors,
}: {
  statoId: string;
  onStatoChange: (v: string) => void;
  priorita: PrioritaLav;
  onPrioritaChange: (v: PrioritaLav) => void;
  addetto: string;
  onAddettoChange: (v: string) => void;
  stati: StatoLavorazioneConfig[];
  addetti: string[];
  addettoColors: Record<string, string>;
  prioritaColors?: Partial<Record<PrioritaLav, string>> | null;
}) {
  const statoOptions = useMemo(
    () => buildStatoTablePillOptions(stati, stati),
    [stati],
  );
  const prioritaOptions = useMemo(
    () => buildPrioritaTablePillOptions(PRIORITA, prioritaColors ?? null),
    [prioritaColors],
  );
  const addettoOptions = useMemo(
    () => buildAddettoTablePillOptions(addetto, addetti, addettoColors),
    [addetto, addetti, addettoColors],
  );
  const statoStyle = useMemo(
    () => statoPillShellStyle(statoDisplayColor(statoId, stati)),
    [statoId, stati],
  );
  const prioritaStyle = useMemo(
    () =>
      prioritaPillShellStyle(
        priorita === "urgente" ? "#b91c1c" : prioritaDisplayColor(priorita, prioritaColors),
      ),
    [priorita, prioritaColors],
  );
  const addettoStyle = useMemo(
    () => addettoPillShellStyleForName(addetto, addettoColors),
    [addetto, addettoColors],
  );

  return (
    <div className="grid gap-3 sm:grid-cols-12">
      <div className="sm:col-span-4">
        <Field label="Stato">
          <GlobalFixedListPillSelect
            value={statoId}
            onChange={onStatoChange}
            options={statoOptions}
            ariaLabel="Stato lavorazione"
            shellClass={statoPillShellClass()}
            fallbackPillStyle={statoStyle}
          />
        </Field>
      </div>
      <div className="sm:col-span-4">
        <Field label="Priorità">
          <GlobalFixedListPillSelect
            value={priorita}
            onChange={(v) => onPrioritaChange(v as PrioritaLav)}
            options={prioritaOptions}
            ariaLabel="Priorità"
            shellClass={prioritaPillShellClass()}
            fallbackPillStyle={prioritaStyle}
          />
        </Field>
      </div>
      <div className="sm:col-span-4">
        <Field label="Addetto">
          <AddettoSelectField
            value={addetto}
            onChange={onAddettoChange}
            options={addettoOptions}
            shellClass={addettoPillShellClass()}
            shellStyle={addettoStyle}
            ariaLabel="Addetto"
          />
        </Field>
      </div>
    </div>
  );
}

export function LavorazioniModalHeader({
  title,
  subtitle,
  onRequestClose,
  onBack,
  titleId = LAV_MODAL_TITLE_ID,
  actions,
  belowTitle,
}: {
  title: string;
  subtitle?: string;
  onRequestClose: () => void;
  onBack?: () => void;
  titleId?: string;
  /** Azioni tra titolo e pulsante chiudi (es. Salva, Modifica). */
  actions?: React.ReactNode;
  /** Contenuto sotto titolo/sottotitolo (meta, link). */
  belowTitle?: React.ReactNode;
}) {
  const stacked = Boolean(belowTitle);
  const hubToolbar = Boolean(actions && subtitle && !stacked);

  if (hubToolbar) {
    return (
      <header className={dsLavorazioniModalWindowHeader}>
        <div className="flex w-full min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className={`${dsModalHeaderLead} min-w-0 basis-[min(100%,12rem)]`}>
            {onBack ? (
              <button type="button" className={dsModalBackBtn} onClick={onBack}>
                ← Indietro
              </button>
            ) : null}
            <div className={dsModalTitleBlock}>
              <h2 id={titleId} className={dsModalTitle}>
                {title}
              </h2>
              <p className={dsModalSubtitleHub}>{subtitle}</p>
            </div>
          </div>
          <div className="ml-auto flex shrink-0 flex-nowrap items-center justify-end gap-2">
            {actions}
            <CloseButton onClick={onRequestClose} className={dsModalCloseBtn} showOnFocus={false} />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={dsLavorazioniModalWindowHeader}>
      <div className={`${dsModalHeaderInner}${stacked ? " items-start sm:items-center" : ""}`}>
        <div className={`${dsModalHeaderLead}${stacked ? " flex-col items-stretch sm:flex-row sm:items-center" : ""}`}>
          {onBack ? (
            <button type="button" className={dsModalBackBtn} onClick={onBack}>
              ← Indietro
            </button>
          ) : null}
          <div className={dsModalTitleBlock}>
            <h2 id={titleId} className={dsModalTitle}>
              {title}
            </h2>
            {subtitle ? <p className={dsModalSubtitle}>{subtitle}</p> : null}
            {belowTitle}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 flex-nowrap items-center justify-end gap-2 sm:flex-wrap">{actions}</div> : null}
        <CloseButton onClick={onRequestClose} className={dsModalCloseBtn} showOnFocus={false} />
      </div>
    </header>
  );
}

/** @deprecated Preferire `LavorazioniModalShell` con `title` / `header` — wrapper compat per meta sotto titolo. */
export function LavorazioniModalTitleBar({
  title,
  titleId,
  onRequestClose,
  children,
}: {
  title?: string;
  titleId?: string;
  onRequestClose: () => void;
  children?: React.ReactNode;
}) {
  if (!title) return null;
  return (
    <LavorazioniModalHeader
      title={title}
      titleId={titleId}
      onRequestClose={onRequestClose}
      belowTitle={children}
    />
  );
}

export type LavorazioniModalDialogSize = "hub" | "compact";

/** Chiusura: click fuori, ESC, X in header; scroll lock come `Modal` globale. */
export function LavorazioniModalShell({
  children,
  modalSize,
  modalHeight,
  size = "standard",
  dialogSize = "hub",
  alignTop,
  layerClassName,
  onRequestClose,
  title,
  subtitle,
  onBack,
  header,
  titleId,
  footer,
  modalRootRef,
}: {
  children: React.ReactNode;
  /** Categoria semantica — SSOT dimensioni (`lib/ui/modal-size-system.ts`). */
  modalSize?: ModalSize;
  /** Override altezza desktop (default derivato da `modalSize`). */
  modalHeight?: ModalHeight;
  /** @deprecated Usare `modalSize="formMedium"`. */
  size?: GestionaleModalWidth;
  /** @deprecated Usare `modalHeight="compact"|"standard"`. */
  dialogSize?: LavorazioniModalDialogSize;
  alignTop?: boolean;
  /** Es. `z-[110]` quando la modale si apre sopra un'altra modale gestionale. */
  layerClassName?: string;
  onRequestClose: () => void;
  /** Se impostato, mostra header standard con titolo e X. */
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  /** Header custom (ignora title/subtitle se fornito). */
  header?: React.ReactNode;
  /** Id titolo per `aria-labelledby` (default se `title` è impostato). */
  titleId?: string;
  /** Footer fisso sotto il corpo scrollabile. */
  footer?: React.ReactNode;
  /** Ref opzionale al dialog root (`data-cab-modal-root`) per flush pre-save via button. */
  modalRootRef?: React.RefObject<HTMLDivElement | null>;
}) {
  useBodyScrollLock(true, "LavorazioniModalShell");
  useOverlayBackHandler(true, onRequestClose, "LavorazioniModalShell", { layer: "modal" });
  useDevModalLayoutLint(true, "lavorazioni-modal-shell");
  const dialogFocus = useGestionaleModalDialogFocus();
  useMobileModalKeyboard(dialogFocus.ref);
  const maxMdDown = useMaxMdDown();
  const modalOpenStartRef = useRef(typeof performance !== "undefined" ? performance.now() : 0);

  useLayoutEffect(() => {
    const durationMs = Math.round(performance.now() - modalOpenStartRef.current);
    recordHealthMetric("modalOpenMs", durationMs);
  }, []);

  const labelledBy = title ? (titleId ?? LAV_MODAL_TITLE_ID) : titleId;
  const { widthClass: dialogMaxWidth, surfaceClass: dialogSurfaceClass } = resolveShellModalLayout({
    modalSize,
    modalHeight,
    legacyDialogSize: modalSize == null && modalHeight == null ? dialogSize : undefined,
  });
  const headerNode =
    header ??
    (title ? (
      <LavorazioniModalHeader
        title={title}
        subtitle={subtitle}
        onRequestClose={onRequestClose}
        onBack={onBack}
        titleId={labelledBy}
      />
    ) : null);

  useEffect(() => {
    function hasVisibleOpenDropdown(): boolean {
      if (document.querySelector('input[role="combobox"][aria-expanded="true"]')) return true;
      for (const el of document.querySelectorAll('[role="listbox"]')) {
        if (el instanceof HTMLElement && el.offsetParent !== null) return true;
      }
      return false;
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (hasVisibleOpenDropdown()) return;
      onRequestClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onRequestClose]);

  return typeof document === "undefined"
    ? null
    : createPortal(
        <div
          className={`${dsLavorazioniModalLayer} ${layerClassName ?? ""}`}
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              onRequestClose();
            }
          }}
        >
          <div
            ref={(el) => {
              dialogFocus.ref.current = el;
              if (modalRootRef) modalRootRef.current = el;
            }}
            {...{ [CAB_MODAL_ROOT_ATTR]: "" }}
            className={`${dialogSurfaceClass} ${flexShrinkSafe} flex-safe-col touch-auto cursor-default ${dialogMaxWidth} ${alignTop ? "md:mt-3 md:self-start" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            onKeyDown={dialogFocus.onKeyDown}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              {...(maxMdDown ? { [CAB_MODAL_SCROLL_ATTR]: "" } : {})}
              className={`flex min-h-0 min-w-0 flex-1 flex-col ${
                maxMdDown
                  ? `${gestionaleModalScrollBodyMobileClass} ${cabModalScrollKeyboardPad} overflow-y-auto`
                  : "overflow-hidden"
              }`.trim()}
            >
              {headerNode}
              <div className="flex min-h-0 min-w-0 flex-col max-md:flex-none max-md:overflow-visible md:flex-1 md:overflow-hidden">
                {children}
              </div>
            </div>
            {footer ? (
              <footer
                className={`${dsModalFormFooter} max-md:pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]`}
              >
                {footer}
              </footer>
            ) : null}
          </div>
        </div>,
        document.body,
      );
}

export function EditLavorazioneModal({
  title,
  initial,
  stati,
  addetti,
  addettoColors,
  prioritaColors,
  onCommit,
  onRequestClose,
}: {
  title: string;
  initial: LavorazioneAttiva;
  stati: StatoLavorazioneConfig[];
  addetti: string[];
  addettoColors: Record<string, string>;
  /** Colori priorità da preferenze (opzionale). */
  prioritaColors?: Partial<Record<PrioritaLav, string>> | null;
  onCommit: (next: LavorazioneAttiva) => void;
  onRequestClose: () => void;
}) {
  const [local, setLocal] = useState<LavorazioneAttiva>(() => initial);
  const [dataIngressoText, setDataIngressoText] = useState(() => isoToItDisplay(initial.dataIngresso));
  const [dataUscitaText, setDataUscitaText] = useState(() =>
    initial.dataCompletamento ? isoToItDisplay(initial.dataCompletamento) : "",
  );
  const [dateErr, setDateErr] = useState<string | null>(null);
  const submitLock = useSubmitLock();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void runSubmitFromGetter(
      e.currentTarget,
      submitLock,
      () => ({
        local,
        dataIngressoText,
        dataUscitaText,
      }),
      (snap) => {
        const inOk = parseItalianDayDisplayToIso(snap.dataIngressoText);
        if (!inOk.ok) {
          setDateErr("Data ingresso non valida. Usa gg/mm/aaaa (es. 10/05/2026) oppure aaaa-mm-gg.");
          return;
        }
        const uscOk = parseOptionalItalianDayDisplayToIso(snap.dataUscitaText);
        if (!uscOk.ok) {
          setDateErr("Data uscita non valida.");
          return;
        }
        setDateErr(null);
        onCommit({
          ...snap.local,
          dataIngresso: inOk.iso,
          dataCompletamento: uscOk.iso,
        });
      },
    );
  }

  return (
    <LavorazioniModalShell modalSize="formMedium" onRequestClose={onRequestClose} title={title} titleId="lav-edit-modal-title">
      <form {...gestionaleFormFocusScopeProps()} onSubmit={handleSubmit} className={`${gestionaleModalBodyFlexClass} overflow-hidden`}>
        <GestionaleModalScrollBody className="space-y-4">
          <div
            {...{ [CAB_FOCUS_SCROLL_GROUP_ATTR]: "" }}
            className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40"
          >
            <SectionTitle>Mezzo</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-12">
              <div className="sm:col-span-12">
                <Field label="Macchina">
                  <input
                    className={dsInput}
                    value={local.macchina}
                    onChange={(e) => setLocal({ ...local, macchina: e.target.value })}
                    required
                  />
                </Field>
              </div>
              <div className="sm:col-span-4">
                <Field label="Targa">
                  <input
                    className={`${dsInput} font-mono text-xs`}
                    value={local.targa}
                    onChange={(e) => setLocal({ ...local, targa: e.target.value })}
                    required
                  />
                </Field>
              </div>
              <div className="sm:col-span-4">
                <Field label="Matricola">
                  <input
                    className={`${dsInput} font-mono text-xs`}
                    value={local.matricola}
                    onChange={(e) => setLocal({ ...local, matricola: e.target.value })}
                    required
                  />
                </Field>
              </div>
              <div className="sm:col-span-4">
                <Field label="N. scuderia">
                  <input
                    className={`${dsInput} font-mono text-xs`}
                    value={local.nScuderia}
                    onChange={(e) => setLocal({ ...local, nScuderia: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          </div>

          <div
            {...{ [CAB_FOCUS_SCROLL_GROUP_ATTR]: "" }}
            className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40"
          >
            <SectionTitle>Committente e utilizzo</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-12">
              <div className="sm:col-span-6">
                <Field label="Cliente">
                  <input
                    className={dsInput}
                    value={local.cliente}
                    onChange={(e) => setLocal({ ...local, cliente: e.target.value })}
                    required
                  />
                </Field>
              </div>
              <div className="sm:col-span-6">
                <Field label="Utilizzatore finale">
                  <input
                    className={dsInput}
                    value={local.utilizzatore}
                    onChange={(e) => setLocal({ ...local, utilizzatore: e.target.value })}
                    required
                  />
                </Field>
              </div>
              <div className="sm:col-span-12">
                <Field label="Cantiere">
                  <input
                    className={dsInput}
                    value={local.cantiere ?? ""}
                    onChange={(e) => setLocal({ ...local, cantiere: e.target.value })}
                    placeholder="Opzionale"
                  />
                </Field>
              </div>
            </div>
          </div>

          <div
            {...{ [CAB_FOCUS_SCROLL_GROUP_ATTR]: "" }}
            className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40"
          >
            <SectionTitle>Gestione intervento</SectionTitle>
            <LavorazioniInterventoPillFields
              statoId={local.statoId}
              onStatoChange={(v) => setLocal({ ...local, statoId: v })}
              priorita={local.priorita}
              onPrioritaChange={(v) => setLocal({ ...local, priorita: v })}
              addetto={local.addetto}
              onAddettoChange={(v) => setLocal({ ...local, addetto: v })}
              stati={stati}
              addetti={addetti}
              addettoColors={addettoColors}
              prioritaColors={prioritaColors}
            />
          </div>

          <div
            {...{ [CAB_FOCUS_SCROLL_GROUP_ATTR]: "" }}
            className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40"
          >
            <SectionTitle>Pianificazione</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-12">
              <div className="sm:col-span-6">
                <Field label="Data ingresso">
                  <LavorazioniDateField
                    value={dataIngressoText}
                    onChange={(v) => {
                      setDataIngressoText(v);
                      setDateErr(null);
                    }}
                    inputClassName={dsInput}
                    required
                  />
                </Field>
              </div>
              <div className="sm:col-span-6">
                <Field label="Data uscita (opz.)">
                  <LavorazioniDateField
                    value={dataUscitaText}
                    onChange={(v) => {
                      setDataUscitaText(v);
                      setDateErr(null);
                    }}
                    inputClassName={dsInput}
                    placeholder="vuoto se non applicabile"
                  />
                </Field>
              </div>
            </div>
            {dateErr ? <p className="mt-2 text-xs text-red-600 dark:text-red-400">{dateErr}</p> : null}
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              Solo giorno (senza orario). Digita gg/mm/aaaa o aaaa-mm-gg, oppure apri il calendario. Controlli al salvataggio.
            </p>
          </div>

          <div
            {...{ [CAB_FOCUS_SCROLL_GROUP_ATTR]: "" }}
            className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40"
          >
            <SectionTitle>Note interne</SectionTitle>
            <GestionaleTextarea
              className="min-h-[5.5rem]"
              size="lg"
              value={local.noteInterne}
              onChange={(noteInterne) => setLocal({ ...local, noteInterne })}
              rows={4}
            />
          </div>
        </GestionaleModalScrollBody>
        <div className="shrink-0 border-t border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <button type="submit" className={`${erpBtnAccent} w-full`}>
            Salva modifiche
          </button>
        </div>
      </form>
    </LavorazioniModalShell>
  );
}

export function NewLavorazioneModal({
  draft,
  setDraft,
  mezzi,
  stati,
  addetti,
  addettoColors,
  prioritaColors,
  onSave,
  onRequestClose,
}: {
  draft: LavorazioneAttiva;
  setDraft: (next: Partial<LavorazioneAttiva>) => void;
  mezzi: MezzoGestito[];
  stati: StatoLavorazioneConfig[];
  addetti: string[];
  addettoColors: Record<string, string>;
  prioritaColors?: Partial<Record<PrioritaLav, string>> | null;
  onSave: (row: LavorazioneAttiva) => void;
  onRequestClose: () => void;
}) {
  const d = draft;
  const [ingressoText, setIngressoText] = useState(() => isoToItDisplay(d.dataIngresso));
  const [dateErr, setDateErr] = useState<string | null>(null);

  useEffect(() => {
    setIngressoText(isoToItDisplay(d.dataIngresso));
  }, [d.dataIngresso]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const inOk = parseItalianDayDisplayToIso(ingressoText);
    if (!inOk.ok) {
      setDateErr("Data ingresso non valida. Usa gg/mm/aaaa (es. 10/05/2026) oppure aaaa-mm-gg.");
      return;
    }
    setDateErr(null);
    onSave({ ...d, dataIngresso: inOk.iso });
  }

  return (
    <LavorazioniModalShell modalSize="formMedium" onRequestClose={onRequestClose} title="Nuova lavorazione" titleId="lav-new-modal-title">
      <form {...gestionaleFormFocusScopeProps()} onSubmit={handleSubmit} className={`${gestionaleModalBodyFlexClass} overflow-hidden`}>
        <GestionaleModalScrollBody className="space-y-4">
          <div
            {...{ [CAB_FOCUS_SCROLL_GROUP_ATTR]: "" }}
            className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40"
          >
            <SectionTitle>Mezzo</SectionTitle>
            <LavorazioneMezzoPicker mezzi={mezzi} draft={d} setDraft={setDraft} />
            <div className="mt-4 grid gap-3">
              <Field label="Macchina">
                <input
                  className={dsInput}
                  value={d.macchina}
                  onChange={(e) => setDraft({ ...d, macchina: e.target.value })}
                  required
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Targa">
                  <input
                    className={`${dsInput} font-mono text-xs`}
                    value={d.targa}
                    onChange={(e) => setDraft({ ...d, targa: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Matricola">
                  <input
                    className={`${dsInput} font-mono text-xs`}
                    value={d.matricola}
                    onChange={(e) => setDraft({ ...d, matricola: e.target.value })}
                    required
                  />
                </Field>
                <Field label="N. scuderia">
                  <input
                    className={`${dsInput} font-mono text-xs`}
                    value={d.nScuderia}
                    onChange={(e) => setDraft({ ...d, nScuderia: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          </div>

          <div
            {...{ [CAB_FOCUS_SCROLL_GROUP_ATTR]: "" }}
            className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40"
          >
            <SectionTitle>Committente e utilizzo</SectionTitle>
            <div className="grid gap-3">
              <Field label="Cliente">
                <input
                  className={dsInput}
                  value={d.cliente}
                  onChange={(e) => setDraft({ ...d, cliente: e.target.value })}
                  required
                />
              </Field>
              <Field label="Utilizzatore finale">
                <input
                  className={dsInput}
                  value={d.utilizzatore}
                  onChange={(e) => setDraft({ ...d, utilizzatore: e.target.value })}
                  required
                />
              </Field>
              <Field label="Cantiere">
                <input
                  className={dsInput}
                  value={d.cantiere ?? ""}
                  onChange={(e) => setDraft({ ...d, cantiere: e.target.value })}
                  placeholder="Opzionale"
                />
              </Field>
            </div>
          </div>

          <div
            {...{ [CAB_FOCUS_SCROLL_GROUP_ATTR]: "" }}
            className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40"
          >
            <SectionTitle>Gestione intervento</SectionTitle>
            <LavorazioniInterventoPillFields
              statoId={d.statoId}
              onStatoChange={(v) => setDraft({ statoId: v })}
              priorita={d.priorita}
              onPrioritaChange={(v) => setDraft({ priorita: v })}
              addetto={d.addetto}
              onAddettoChange={(v) => setDraft({ addetto: v })}
              stati={stati}
              addetti={addetti}
              addettoColors={addettoColors}
              prioritaColors={prioritaColors}
            />
          </div>

          <div
            {...{ [CAB_FOCUS_SCROLL_GROUP_ATTR]: "" }}
            className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40"
          >
            <SectionTitle>Tempi e note</SectionTitle>
            <div className="grid gap-3">
              <Field label="Data ingresso">
                <LavorazioniDateField
                  value={ingressoText}
                  onChange={(v) => {
                    setIngressoText(v);
                    setDateErr(null);
                  }}
                  inputClassName={dsInput}
                  required
                />
              </Field>
              {dateErr ? <p className="text-xs text-red-600 dark:text-red-400">{dateErr}</p> : null}
              <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                Solo giorno (senza orario). Digita gg/mm/aaaa o aaaa-mm-gg, oppure apri il calendario.
              </p>
              <Field label="Note">
                <GestionaleTextarea
                  className="min-h-[4.5rem]"
                  size="md"
                  value={d.noteInterne}
                  onChange={(noteInterne) => setDraft({ ...d, noteInterne })}
                  rows={3}
                />
              </Field>
            </div>
          </div>
        </GestionaleModalScrollBody>
        <div className="shrink-0 border-t border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <button type="submit" className={`${erpBtnAccent} w-full`}>
            Crea lavorazione
          </button>
        </div>
      </form>
    </LavorazioniModalShell>
  );
}

type SettingsTab = "stati" | "priorita" | "addetti";

export type SettingsLavorazioniTab = SettingsTab;

export function SettingsLavorazioniModal({
  stati,
  onAddStatoFromLabel,
  onChangeStatoLabel,
  onChangeStatoColor,
  onRemoveStato,
  onReorderStato,
  addettiRecords,
  addettoColors,
  prioritaColors,
  onChangePrioritaColor,
  onAddAddetto,
  onUpdateAddetto,
  onChangeAddettoColor,
  onRemoveAddetto,
  attiviStatoIds,
  storicoStatoIds,
  attiviAddetti,
  storicoAddetti,
  onRequestClose,
  layout = "modal",
  /** Con `layout="embedded"`: mostra solo il pannello indicato (senza tab interni). */
  embeddedFocus = null,
}: {
  stati: StatoLavorazioneConfig[];
  onAddStatoFromLabel: (label: string) => void;
  onChangeStatoLabel: (id: string, label: string) => void;
  onChangeStatoColor: (id: string, hex: string) => void;
  onRemoveStato: (id: string) => void;
  onReorderStato?: (fromIndex: number, toIndex: number) => void;
  addettiRecords: AddettoRecord[];
  addettoColors: Record<string, string>;
  prioritaColors: Partial<Record<PrioritaLav, string>>;
  onChangePrioritaColor: (p: PrioritaLav, hex: string) => void;
  onAddAddetto: (input: { nome: string; cognome?: string | null }) => void;
  onUpdateAddetto: (id: string, patch: { nome?: string; cognome?: string | null }) => void;
  onChangeAddettoColor: (nome: string, hex: string) => void;
  onRemoveAddetto: (id: string) => void;
  attiviStatoIds: Set<string>;
  storicoStatoIds: Set<string>;
  attiviAddetti: Set<string>;
  storicoAddetti: Set<string>;
  onRequestClose: () => void;
  /** `embedded`: solo contenuto (senza shell modale) per annidamento in «Impostazioni sistema». */
  layout?: "modal" | "embedded";
  embeddedFocus?: SettingsLavorazioniTab | null;
}) {
  const [tab, setTab] = useState<SettingsTab>("stati");

  const lockedTab = layout === "embedded" && embeddedFocus ? embeddedFocus : null;
  const embeddedTabPanelClass = "w-full min-w-0";
  const modalTabPanelClass =
    "min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-[color:color-mix(in_srgb,var(--cab-surface-2)_35%,var(--cab-card))] p-3 sm:p-4 [scrollbar-gutter:stable]";
  const settingsTitle =
    lockedTab === "stati"
      ? "Stati lavorazioni"
      : lockedTab === "priorita"
        ? "Priorità"
        : lockedTab === "addetti"
          ? "Addetti"
          : "Impostazioni lavorazioni";

  useEffect(() => {
    if (lockedTab) setTab(lockedTab);
  }, [lockedTab]);

  const addettiPanel = (
    <AddettiSettingsSection
      embedded={Boolean(lockedTab)}
      addettiRecords={addettiRecords}
      addettoColors={addettoColors}
      onAddAddetto={onAddAddetto}
      onChangeAddettoColor={onChangeAddettoColor}
      onUpdateAddetto={onUpdateAddetto}
      onRemove={onRemoveAddetto}
      attiviAddetti={attiviAddetti}
      storicoAddetti={storicoAddetti}
    />
  );

  const statiPanel = (
    <StatiSettingsSection
      layout={lockedTab ? "flat" : "card"}
      stati={stati}
      onAddStatoFromLabel={onAddStatoFromLabel}
      onChangeLabel={onChangeStatoLabel}
      onChangeStatoColor={onChangeStatoColor}
      onRemove={onRemoveStato}
      onReorder={onReorderStato}
    />
  );

  const prioritaPanel = (
    <PrioritaSettingsSection
      layout={lockedTab ? "flat" : "card"}
      prioritaColors={prioritaColors}
      onChangePrioritaColor={onChangePrioritaColor}
    />
  );

  if (layout === "embedded" && lockedTab) {
    if (lockedTab === "addetti") return addettiPanel;
    if (lockedTab === "stati") return statiPanel;
    if (lockedTab === "priorita") return prioritaPanel;
  }

  const tabBtn = (id: SettingsTab, label: string) => {
    const active = tab === id;
    return (
      <button
        key={id}
        type="button"
        role="tab"
        aria-selected={active}
        className={`rounded-lg px-3 py-2 text-xs font-semibold transition-[background-color,color,box-shadow] duration-150 ${
          active ? dsSegmentedBtnOn : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/90"
        }`}
        onClick={() => setTab(id)}
      >
        {label}
      </button>
    );
  };

  const inner = (
      <div
        className={
          lockedTab
            ? embeddedTabPanelClass
            : `flex min-h-0 w-full min-w-0 flex-col ${gestionaleModalBodyFlexClass} overflow-hidden`
        }
      >
        {!lockedTab ? (
          <div
            role="tablist"
            aria-labelledby="lavorazioni-settings-title"
            className={`hub-modal-tab-bar ${dsHubModalTabBar} px-3 py-2`}
          >
            {tabBtn("stati", "Stati lavorazione")}
            {tabBtn("priorita", "Priorità")}
            {tabBtn("addetti", "Addetti")}
          </div>
        ) : null}

        <div
          role="tabpanel"
          aria-label={tab === "stati" ? "Stati lavorazione" : tab === "priorita" ? "Priorità" : "Addetti"}
          className={lockedTab ? embeddedTabPanelClass : modalTabPanelClass}
        >
          {tab === "stati" ? statiPanel : null}

          {tab === "priorita" ? prioritaPanel : null}

          {tab === "addetti" ? addettiPanel : null}
        </div>
      </div>
  );

  if (layout === "embedded") {
    return inner;
  }

  return (
    <LavorazioniModalShell
      modalSize="formLarge"
      onRequestClose={onRequestClose}
      title={settingsTitle}
      titleId="lavorazioni-settings-title"
      footer={
        layout === "modal" ? (
          <button type="button" className={`${erpBtnNeutral} min-h-11`} onClick={onRequestClose}>
            Chiudi
          </button>
        ) : undefined
      }
    >
      {inner}
    </LavorazioniModalShell>
  );
}
