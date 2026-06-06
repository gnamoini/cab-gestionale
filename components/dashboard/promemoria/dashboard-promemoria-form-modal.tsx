"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button, LoadingButton } from "@/components/design-system";
import { GlobalDatePickerYmd } from "@/components/gestionale/global-input";
import { DashboardPromemoriaScopeDialog } from "@/components/dashboard/promemoria/dashboard-promemoria-scope-dialog";
import {
  GestionaleModalScrollBody,
  GestionaleModalShell,
} from "@/components/gestionale/gestionale-modal";
import { GestionaleUnsavedChangesDialog } from "@/components/gestionale/gestionale-unsaved-changes-dialog";
import { gestionaleFormFocusScopeProps } from "@/components/gestionale/gestionale-form-focus-scope";
import type { DashboardPromemoriaRecurrenceInput } from "@/lib/dashboard/dashboard-promemoria-types";
import type { DashboardPromemoriaRow } from "@/lib/dashboard/dashboard-promemoria-types";
import {
  PROMEMORIA_RECURRENCE_FREQUENCY_LABELS,
  maxRecurrenceUntilYmd,
  type PromemoriaRecurrenceFrequency,
  type PromemoriaRecurrenceScope,
} from "@/lib/dashboard/dashboard-promemoria-recurrence";
import { promemoriaEventTimeInputValue } from "@/lib/dashboard/dashboard-promemoria-reminder";
import { useBeforeUnloadWhenDirty } from "@/lib/forms/use-before-unload-when-dirty";
import { dsInput, dsModalFormFooter, dsTypoSmall } from "@/lib/ui/design-system";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";

export type DashboardPromemoriaFormSubmitPayload = {
  eventDate: string;
  eventTime: string | null;
  title: string;
  description: string | null;
  recurrence?: DashboardPromemoriaRecurrenceInput;
  scope?: PromemoriaRecurrenceScope;
};

function promemoriaFormSnapshot(payload: {
  eventDate: string;
  eventTime: string;
  title: string;
  description: string;
  repeatEnabled: boolean;
  frequency: string;
  untilYmd: string;
}): string {
  return JSON.stringify(payload);
}

const FREQUENCY_OPTIONS: PromemoriaRecurrenceFrequency[] = ["daily", "weekly", "monthly", "yearly"];

export function DashboardPromemoriaFormModal({
  onClose,
  initialDate,
  editing,
  saving,
  onSubmit,
}: {
  onClose: () => void;
  initialDate: string;
  editing: DashboardPromemoriaRow | null;
  saving: boolean;
  onSubmit: (payload: DashboardPromemoriaFormSubmitPayload) => void;
}) {
  const [eventDate, setEventDate] = useState(initialDate);
  const [eventTime, setEventTime] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [frequency, setFrequency] = useState<PromemoriaRecurrenceFrequency>("weekly");
  const [untilYmd, setUntilYmd] = useState("");
  const [baselineSnapshot, setBaselineSnapshot] = useState("");
  const [unsavedExitOpen, setUnsavedExitOpen] = useState(false);
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const dataFieldId = useId();
  const timeFieldId = useId();
  const titleFieldId = useId();
  const descriptionFieldId = useId();
  const repeatUntilFieldId = useId();
  const frequencyFieldId = useId();

  const isSeriesMember = Boolean(editing?.series_id);

  useEffect(() => {
    const nextDate = editing?.event_date ?? initialDate;
    const nextTime = promemoriaEventTimeInputValue(editing?.event_time);
    const nextTitle = editing?.title ?? "";
    const nextDescription = editing?.description ?? "";
    setEventDate(nextDate);
    setEventTime(nextTime);
    setTitle(nextTitle);
    setDescription(nextDescription);
    setRepeatEnabled(false);
    setFrequency("weekly");
    setUntilYmd(maxRecurrenceUntilYmd(nextDate));
    setBaselineSnapshot(
      promemoriaFormSnapshot({
        eventDate: nextDate,
        eventTime: nextTime,
        title: nextTitle,
        description: nextDescription,
        repeatEnabled: false,
        frequency: "weekly",
        untilYmd: maxRecurrenceUntilYmd(nextDate),
      }),
    );
    setUnsavedExitOpen(false);
    setScopeDialogOpen(false);
  }, [editing, initialDate]);

  useEffect(() => {
    if (!repeatEnabled || editing) return;
    setUntilYmd((prev) => {
      if (prev && prev >= eventDate) return prev;
      return maxRecurrenceUntilYmd(eventDate);
    });
  }, [eventDate, repeatEnabled, editing]);

  const isDirty = useMemo(() => {
    if (!baselineSnapshot) return false;
    return (
      promemoriaFormSnapshot({
        eventDate,
        eventTime,
        title,
        description,
        repeatEnabled,
        frequency,
        untilYmd,
      }) !== baselineSnapshot
    );
  }, [baselineSnapshot, description, eventDate, eventTime, frequency, repeatEnabled, title, untilYmd]);

  useBeforeUnloadWhenDirty(isDirty, "Hai modifiche non salvate nel promemoria.");

  const buildPayload = useCallback(
    (scope?: PromemoriaRecurrenceScope): DashboardPromemoriaFormSubmitPayload => ({
      eventDate,
      eventTime: eventTime.trim() || null,
      title,
      description: description.trim() || null,
      scope,
      recurrence: editing
        ? undefined
        : {
            enabled: repeatEnabled,
            frequency: repeatEnabled ? frequency : null,
            interval: 1,
            untilYmd: repeatEnabled ? untilYmd : null,
          },
    }),
    [description, editing, eventDate, eventTime, frequency, repeatEnabled, title, untilYmd],
  );

  const commitSubmit = useCallback(
    (scope?: PromemoriaRecurrenceScope) => {
      onSubmit(buildPayload(scope));
    },
    [buildPayload, onSubmit],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editing?.series_id) {
      setScopeDialogOpen(true);
      return;
    }
    commitSubmit();
  }

  const requestClose = useCallback(() => {
    if (saving) return;
    if (isDirty) {
      setUnsavedExitOpen(true);
      return;
    }
    onClose();
  }, [isDirty, onClose, saving]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <GestionaleModalShell
        modalSize="formSmall"
        modalHeight="compact"
        onRequestClose={requestClose}
        title={editing ? "Modifica promemoria" : "Nuovo promemoria"}
        titleId="dashboard-promemoria-modal-title"
        layerClassName="cursor-pointer"
      >
        <form
          ref={formRef}
          id="dashboard-promemoria-form"
          {...gestionaleFormFocusScopeProps()}
          className={`${gestionaleModalBodyFlexClass} min-w-0 overflow-hidden`}
          onSubmit={handleSubmit}
        >
          <GestionaleModalScrollBody className="space-y-4">
            <label className="flex flex-col gap-1" htmlFor={dataFieldId}>
              <span
                className={`${dsTypoSmall} font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]`}
              >
                Data
              </span>
              <GlobalDatePickerYmd
                id={dataFieldId}
                valueYmd={eventDate}
                onChangeYmd={setEventDate}
                aria-label="Data promemoria"
                variant="default"
              />
            </label>
            <label className="flex flex-col gap-1" htmlFor={timeFieldId}>
              <span
                className={`${dsTypoSmall} font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]`}
              >
                Orario (facoltativo)
              </span>
              <input
                id={timeFieldId}
                type="time"
                className={dsInput}
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                aria-label="Orario promemoria"
              />
              <span className={`${dsTypoSmall} text-[color:var(--cab-text-muted)]`}>
                Se impostato, la notifica arriva 30 minuti prima; altrimenti alle 09:00.
              </span>
            </label>
            <label className="flex flex-col gap-1" htmlFor={titleFieldId}>
              <span
                className={`${dsTypoSmall} font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]`}
              >
                Titolo
              </span>
              <input
                id={titleFieldId}
                className={dsInput}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
                placeholder="Es. Revisione mezzo ABC"
                autoFocus
              />
            </label>
            <label className="flex flex-col gap-1" htmlFor={descriptionFieldId}>
              <span
                className={`${dsTypoSmall} font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]`}
              >
                Descrizione (facoltativa)
              </span>
              <textarea
                id={descriptionFieldId}
                className={`${dsInput} min-h-[5rem] resize-y`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                placeholder="Dettagli aggiuntivi…"
              />
            </label>
            {!editing ? (
              <div className="space-y-3 rounded-lg border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface)_92%,var(--cab-hover))] p-3">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 accent-[var(--cab-primary)]"
                    checked={repeatEnabled}
                    onChange={(e) => setRepeatEnabled(e.target.checked)}
                  />
                  <span className={`${dsTypoSmall} font-semibold text-[color:var(--cab-text)]`}>Ripeti</span>
                </label>
                {repeatEnabled ? (
                  <div className="space-y-3">
                    <label className="flex flex-col gap-1" htmlFor={frequencyFieldId}>
                      <span
                        className={`${dsTypoSmall} font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]`}
                      >
                        Frequenza
                      </span>
                      <select
                        id={frequencyFieldId}
                        className={dsInput}
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value as PromemoriaRecurrenceFrequency)}
                      >
                        {FREQUENCY_OPTIONS.map((f) => (
                          <option key={f} value={f}>
                            {PROMEMORIA_RECURRENCE_FREQUENCY_LABELS[f]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1" htmlFor={repeatUntilFieldId}>
                      <span
                        className={`${dsTypoSmall} font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]`}
                      >
                        Ripeti fino al
                      </span>
                      <GlobalDatePickerYmd
                        id={repeatUntilFieldId}
                        valueYmd={untilYmd}
                        onChangeYmd={setUntilYmd}
                        aria-label="Data fine ripetizione"
                        variant="default"
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            ) : isSeriesMember ? (
              <p className={`${dsTypoSmall} text-[color:var(--cab-text-muted)]`}>
                Questo promemoria fa parte di una serie. Al salvataggio potrai scegliere se applicare le modifiche a una
                sola occorrenza, alle successive o all&apos;intera serie.
              </p>
            ) : null}
          </GestionaleModalScrollBody>
          <footer className={dsModalFormFooter}>
            <div className="ml-auto flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <Button type="button" variant="secondary" onClick={requestClose} disabled={saving}>
                Annulla
              </Button>
              <LoadingButton type="submit" loading={saving} disabled={saving}>
                {editing ? "Salva" : "Crea"}
              </LoadingButton>
            </div>
          </footer>
        </form>
      </GestionaleModalShell>
      <DashboardPromemoriaScopeDialog
        open={scopeDialogOpen}
        mode="edit"
        title={title.trim() || editing?.title || "Promemoria"}
        onClose={() => setScopeDialogOpen(false)}
        onSelect={(scope) => {
          setScopeDialogOpen(false);
          commitSubmit(scope);
        }}
      />
      <GestionaleUnsavedChangesDialog
        open={unsavedExitOpen}
        placement="stacked"
        title="Modifiche non salvate"
        message="Hai modifiche non salvate nel promemoria. Come vuoi procedere?"
        pending={saving}
        onStay={() => setUnsavedExitOpen(false)}
        onDiscard={() => {
          setUnsavedExitOpen(false);
          onClose();
        }}
        onSaveAndExit={() => {
          setUnsavedExitOpen(false);
          if (editing?.series_id) {
            setScopeDialogOpen(true);
          } else {
            commitSubmit();
          }
        }}
      />
    </>,
    document.body,
  );
}
