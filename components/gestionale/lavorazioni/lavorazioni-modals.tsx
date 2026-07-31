"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { runSubmitFromGetter, useSubmitLock } from "@/lib/forms/form-engine";
import {
  LavorazioniModalShell,
  type LavorazioniModalDialogSize,
} from "@/components/gestionale/gestionale-modal-shell";
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
import { AddettoPicker } from "@/components/domain/addetti";
import { GlobalFixedListPillSelect } from "@/components/gestionale/global-input";
import {
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
  GestionaleModalFooterCancelButton,
} from "@/components/design-system";
import {
  erpBtnAccent,
  prioritaPillShellClass,
  prioritaPillShellStyle,
  statoPillShellClass,
  statoPillShellStyle,
} from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { gestionaleFormFocusScopeProps } from "@/components/gestionale/gestionale-form-focus-scope";
import { GestionaleTextarea } from "@/components/gestionale/gestionale-textarea";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import {
  dsInput,
  dsLabel,
  dsHubModalTabBar,
  dsSegmentedBtnOn,
} from "@/lib/ui/design-system";
import { orderPrioritaList } from "@/lib/lavorazioni/priorita-order";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import {
  CAB_FOCUS_SCROLL_GROUP_ATTR,
  CAB_FOCUS_SCROLL_TITLE_ATTR,
} from "@/lib/ui/mobile-modal-behavior";

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

export {
  LavorazioniModalShell,
  LavorazioniModalHeader,
  LavorazioniModalTitleBar,
  type LavorazioniModalDialogSize,
} from "@/components/gestionale/gestionale-modal-shell";

function LavorazioniInterventoPillFields({
  statoId,
  onStatoChange,
  priorita,
  onPrioritaChange,
  addettoId,
  onAddettoChange,
  stati,
  prioritaColors,
}: {
  statoId: string;
  onStatoChange: (v: string) => void;
  priorita: PrioritaLav;
  onPrioritaChange: (v: PrioritaLav) => void;
  addettoId: string;
  onAddettoChange: (v: string) => void;
  stati: StatoLavorazioneConfig[];
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
          <AddettoPicker
            value={addettoId || null}
            onChange={onAddettoChange}
            ariaLabel="Addetto"
            size="form"
          />
        </Field>
      </div>
    </div>
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
              addettoId={local.addetto}
              onAddettoChange={(v) => setLocal({ ...local, addetto: v })}
              stati={stati}
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
              value={local.note}
              onChange={(note) => setLocal({ ...local, note })}
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
  onChangeAddettoColor: (colorKey: string, hex: string) => void;
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
          <GestionaleModalFooterCancelButton onClick={onRequestClose}>
            Chiudi
          </GestionaleModalFooterCancelButton>
        ) : undefined
      }
    >
      {inner}
    </LavorazioniModalShell>
  );
}
