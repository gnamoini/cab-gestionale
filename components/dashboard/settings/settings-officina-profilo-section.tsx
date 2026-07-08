"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  OFFICINA_PROFILO_KEY,
  OFFICINA_PROFILO_MODULE,
  parseOfficinaProfiloOperativo,
  type OfficinaProfiloOperativo,
} from "@/lib/officina/officina-profilo-operativo";
import {
  emptyOfficinaSede,
  formatOfficinaSede,
  OFFICINA_SEDE_LEGALE_KEY,
  OFFICINA_SEDE_MODULE,
  OFFICINA_SEDE_OPERATIVA_KEY,
  parseOfficinaSede,
  type OfficinaSede,
} from "@/lib/officina/officina-sede";
import {
  emptyOfficinaDestinatarioOrdiniSettings,
  OFFICINA_DESTINATARIO_ORDINI_KEY,
  OFFICINA_DESTINATARIO_ORDINI_MODULE,
  parseOfficinaDestinatarioOrdiniSettings,
  type OfficinaDestinatarioOrdiniSettings,
} from "@/lib/officina/officina-destinatario-ordini";
import {
  emptyOfficinaBancaOrdini,
  OFFICINA_BANCHE_ORDINI_KEY,
  OFFICINA_BANCHE_ORDINI_MODULE,
  officinaBancheOrdiniToPayload,
  parseOfficinaBancheOrdiniSettings,
  type OfficinaBancaOrdini,
} from "@/lib/officina/officina-banche-ordini";
import { ORDINE_FORNITORE_TELEFONO_DEFAULT } from "@/lib/ordini-fornitori/fornitore-snapshot";
import { sliceInputValue, TEXT_SHORT } from "@/lib/validation/text-field-limits";
import { useSharedAppSettingsQuery } from "@/src/context/app-settings-query-context";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { settingsEntry } from "@/lib/domain/settings-entry";
import { dsBtnNeutralForm, dsFocus, dsInput } from "@/lib/ui/design-system";
import { CloseButton } from "@/components/design-system";

const OPTIONS: {
  value: OfficinaProfiloOperativo;
  label: string;
  description: string;
}[] = [
  {
    value: "attrezzature",
    label: "Solo attrezzature",
    description: "Ingresso con attrezzatura e telaio collegato (campi telaio opzionali).",
  },
  {
    value: "telai",
    label: "Solo telai",
    description: "Solo anagrafica telaio; nessuna sezione attrezzatura.",
  },
  {
    value: "misto",
    label: "Misto",
    description: "Scelta oggetto intervento (telaio o attrezzatura) su ogni ingresso.",
  },
];

const profiloCardBase =
  "flex w-full min-w-0 flex-col gap-0.5 rounded-[var(--ds-radius-lg)] border px-3 py-2.5 text-left transition-[border-color,background-color,box-shadow] duration-150 disabled:cursor-not-allowed disabled:opacity-60";
const profiloCardOn = `${profiloCardBase} border-[color:color-mix(in_srgb,var(--cab-primary)_45%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))] shadow-[var(--cab-shadow-sm)] ring-1 ring-[color:color-mix(in_srgb,var(--cab-primary)_22%,transparent)]`;
const profiloCardOff = `${profiloCardBase} border-[color:color-mix(in_srgb,var(--cab-border-strong)_90%,var(--cab-border))] bg-[var(--cab-surface)] hover:border-[color:var(--cab-border-strong)] hover:bg-[var(--cab-hover)]`;

function SettingsOfficinaSedeBlock({
  settingKey,
  title,
  description,
  disabled,
  onSaved,
}: {
  settingKey: typeof OFFICINA_SEDE_LEGALE_KEY | typeof OFFICINA_SEDE_OPERATIVA_KEY;
  title: string;
  description: string;
  disabled: boolean;
  onSaved: () => Promise<void>;
}) {
  const toast = useGestionaleToast();
  const settingsQ = useSharedAppSettingsQuery();
  const row = settingsQ?.data?.rows?.find(
    (r) => r.module === OFFICINA_SEDE_MODULE && r.key === settingKey,
  );
  const [sede, setSede] = useState<OfficinaSede>(() => emptyOfficinaSede());
  const [saving, setSaving] = useState(false);
  const latestRef = useRef(sede);

  useEffect(() => {
    const parsed = parseOfficinaSede(row?.value);
    setSede(parsed);
    latestRef.current = parsed;
  }, [row?.value]);

  const save = useCallback(async () => {
    if (disabled || saving) return;
    const next = latestRef.current;
    const stored = parseOfficinaSede(row?.value);
    if (JSON.stringify(stored) === JSON.stringify(next)) return;
    setSaving(true);
    const res = await settingsEntry.upsertSetting({
      module: OFFICINA_SEDE_MODULE,
      key: settingKey,
      value: next as unknown as Record<string, unknown>,
      expectedUpdatedAt: row?.updated_at,
    });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error ?? `Errore salvataggio ${title.toLowerCase()}.`);
      const parsed = parseOfficinaSede(row?.value);
      setSede(parsed);
      latestRef.current = parsed;
      return;
    }
    await onSaved();
  }, [disabled, onSaved, row?.updated_at, row?.value, saving, title, toast, settingKey]);

  function patch(partial: Partial<OfficinaSede>) {
    setSede((prev) => {
      const next = { ...prev, ...partial };
      latestRef.current = next;
      return next;
    });
  }

  const preview = formatOfficinaSede(sede);

  return (
    <fieldset className="min-w-0 space-y-3 border-0 border-t border-[color:var(--cab-border)] p-0 pt-5" disabled={disabled || saving}>
      <legend className="mb-1 text-sm font-medium text-[var(--cab-text)]">{title}</legend>
      <p className="text-sm text-[var(--cab-text-muted)]">{description}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs font-medium text-[color:var(--cab-text-muted)]">Via</span>
          <input className={dsInput} value={sede.via} onChange={(e) => patch({ via: e.target.value })} onBlur={() => void save()} />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-[color:var(--cab-text-muted)]">N. civico</span>
          <input className={dsInput} value={sede.numeroCivico} onChange={(e) => patch({ numeroCivico: e.target.value })} onBlur={() => void save()} />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-[color:var(--cab-text-muted)]">CAP</span>
          <input className={dsInput} value={sede.cap} onChange={(e) => patch({ cap: e.target.value })} onBlur={() => void save()} />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-[color:var(--cab-text-muted)]">Città</span>
          <input className={dsInput} value={sede.citta} onChange={(e) => patch({ citta: e.target.value })} onBlur={() => void save()} />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-[color:var(--cab-text-muted)]">Provincia</span>
          <input
            className={dsInput}
            value={sede.provincia}
            maxLength={2}
            onChange={(e) => patch({ provincia: e.target.value.toUpperCase() })}
            onBlur={() => void save()}
          />
        </label>
      </div>
      {preview ? (
        <p className="text-xs text-[color:var(--cab-text-muted)]">
          Anteprima: <span className="text-[color:var(--cab-text)]">{preview}</span>
        </p>
      ) : null}
    </fieldset>
  );
}

function SettingsOfficinaDestinatarioOrdiniAnagraficaBlock({
  disabled,
  onSaved,
}: {
  disabled: boolean;
  onSaved: () => Promise<void>;
}) {
  const toast = useGestionaleToast();
  const settingsQ = useSharedAppSettingsQuery();
  const row = settingsQ?.data?.rows?.find(
    (r) => r.module === OFFICINA_DESTINATARIO_ORDINI_MODULE && r.key === OFFICINA_DESTINATARIO_ORDINI_KEY,
  );
  const [anagrafica, setAnagrafica] = useState<OfficinaDestinatarioOrdiniSettings>(() =>
    emptyOfficinaDestinatarioOrdiniSettings(),
  );
  const [saving, setSaving] = useState(false);
  const latestRef = useRef(anagrafica);

  useEffect(() => {
    const parsed = parseOfficinaDestinatarioOrdiniSettings(row?.value);
    setAnagrafica(parsed);
    latestRef.current = parsed;
  }, [row?.value]);

  const save = useCallback(async () => {
    if (disabled || saving) return;
    const next = latestRef.current;
    const stored = parseOfficinaDestinatarioOrdiniSettings(row?.value);
    if (JSON.stringify(stored) === JSON.stringify(next)) return;
    setSaving(true);
    const res = await settingsEntry.upsertSetting({
      module: OFFICINA_DESTINATARIO_ORDINI_MODULE,
      key: OFFICINA_DESTINATARIO_ORDINI_KEY,
      value: next as unknown as Record<string, unknown>,
      expectedUpdatedAt: row?.updated_at,
    });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error ?? "Errore salvataggio anagrafica destinatario.");
      const parsed = parseOfficinaDestinatarioOrdiniSettings(row?.value);
      setAnagrafica(parsed);
      latestRef.current = parsed;
      return;
    }
    await onSaved();
  }, [disabled, onSaved, row?.updated_at, row?.value, saving, toast]);

  function patch(partial: Partial<OfficinaDestinatarioOrdiniSettings>) {
    setAnagrafica((prev) => {
      const next = { ...prev, ...partial };
      latestRef.current = next;
      return next;
    });
  }

  return (
    <fieldset
      className="min-w-0 space-y-3 border-0 border-t border-[color:var(--cab-border)] p-0 pt-5"
      disabled={disabled || saving}
    >
      <legend className="mb-1 text-sm font-medium text-[var(--cab-text)]">Anagrafica destinatario</legend>
      <p className="text-sm text-[var(--cab-text-muted)]">
        Compilati automaticamente negli ordini fornitori con destinazione «Magazzino».
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs font-medium text-[color:var(--cab-text-muted)]">Ragione sociale</span>
          <input
            className={dsInput}
            value={anagrafica.label}
            onChange={(e) => patch({ label: sliceInputValue(e.target.value, TEXT_SHORT) })}
            onBlur={() => void save()}
            placeholder="Nome azienda"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-[color:var(--cab-text-muted)]">Partita IVA</span>
          <input
            className={dsInput}
            value={anagrafica.partitaIva}
            maxLength={TEXT_SHORT}
            onChange={(e) => patch({ partitaIva: sliceInputValue(e.target.value, TEXT_SHORT) })}
            onBlur={() => void save()}
            placeholder="IT12345678901"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-[color:var(--cab-text-muted)]">Codice fiscale</span>
          <input
            className={dsInput}
            value={anagrafica.codiceFiscale}
            maxLength={TEXT_SHORT}
            onChange={(e) => patch({ codiceFiscale: sliceInputValue(e.target.value, TEXT_SHORT) })}
            onBlur={() => void save()}
            placeholder="Se vuoto, uguale a P. IVA"
          />
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs font-medium text-[color:var(--cab-text-muted)]">Telefono</span>
          <input
            className={dsInput}
            type="tel"
            value={anagrafica.telefono}
            maxLength={TEXT_SHORT}
            onChange={(e) => patch({ telefono: sliceInputValue(e.target.value, TEXT_SHORT) })}
            onBlur={() => void save()}
            placeholder={ORDINE_FORNITORE_TELEFONO_DEFAULT}
          />
        </label>
      </div>
    </fieldset>
  );
}

function SettingsOfficinaBancheOrdiniBlock({
  disabled,
  onSaved,
}: {
  disabled: boolean;
  onSaved: () => Promise<void>;
}) {
  const toast = useGestionaleToast();
  const settingsQ = useSharedAppSettingsQuery();
  const row = settingsQ?.data?.rows?.find(
    (r) => r.module === OFFICINA_BANCHE_ORDINI_MODULE && r.key === OFFICINA_BANCHE_ORDINI_KEY,
  );
  const [banche, setBanche] = useState<OfficinaBancaOrdini[]>([]);
  const [saving, setSaving] = useState(false);
  const latestRef = useRef(banche);

  useEffect(() => {
    const parsed = parseOfficinaBancheOrdiniSettings(row?.value);
    setBanche(parsed);
    latestRef.current = parsed;
  }, [row?.value]);

  const save = useCallback(async () => {
    if (disabled || saving) return;
    const next = latestRef.current;
    const stored = parseOfficinaBancheOrdiniSettings(row?.value);
    if (JSON.stringify(stored) === JSON.stringify(next)) return;
    setSaving(true);
    const res = await settingsEntry.upsertSetting({
      module: OFFICINA_BANCHE_ORDINI_MODULE,
      key: OFFICINA_BANCHE_ORDINI_KEY,
      value: officinaBancheOrdiniToPayload(next) as unknown as Record<string, unknown>,
      expectedUpdatedAt: row?.updated_at,
    });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error ?? "Errore salvataggio banche ordini.");
      const parsed = parseOfficinaBancheOrdiniSettings(row?.value);
      setBanche(parsed);
      latestRef.current = parsed;
      return;
    }
    await onSaved();
  }, [disabled, onSaved, row?.updated_at, row?.value, saving, toast]);

  function patchRow(id: string, patch: Partial<OfficinaBancaOrdini>) {
    setBanche((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, ...patch } : b));
      latestRef.current = next;
      return next;
    });
  }

  function addBanca() {
    setBanche((prev) => {
      const next = [...prev, emptyOfficinaBancaOrdini()];
      latestRef.current = next;
      return next;
    });
  }

  function removeBanca(id: string) {
    setBanche((prev) => {
      const next = prev.filter((b) => b.id !== id);
      latestRef.current = next;
      return next;
    });
  }

  return (
    <fieldset
      className="min-w-0 space-y-3 border-0 border-t border-[color:var(--cab-border)] p-0 pt-5"
      disabled={disabled || saving}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <legend className="mb-1 text-sm font-medium text-[var(--cab-text)]">Banche d&apos;appoggio</legend>
          <p className="text-sm text-[var(--cab-text-muted)]">
            Elenco banche selezionabili negli ordini fornitori (nome e IBAN).
          </p>
        </div>
        <button type="button" className={dsBtnNeutralForm} onClick={addBanca}>
          Aggiungi
        </button>
      </div>
      {banche.length === 0 ? (
        <p className="text-sm text-[color:var(--cab-text-muted)]">Nessuna banca. Aggiungi la prima.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {banche.map((banca, index) => (
            <li key={banca.id} className={index > 0 ? "border-t border-[color:var(--cab-border)] pt-3" : ""}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
                  Banca {index + 1}
                </span>
                <CloseButton
                  label={`Rimuovi banca ${index + 1}`}
                  className="h-9 w-9 shrink-0"
                  onClick={() => {
                    removeBanca(banca.id);
                    void save();
                  }}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-[color:var(--cab-text-muted)]">Nome banca</span>
                  <input
                    className={dsInput}
                    value={banca.nome}
                    maxLength={TEXT_SHORT}
                    onChange={(e) => patchRow(banca.id, { nome: sliceInputValue(e.target.value, TEXT_SHORT) })}
                    onBlur={() => void save()}
                    placeholder="es. Intesa Sanpaolo"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-[color:var(--cab-text-muted)]">IBAN</span>
                  <input
                    className={dsInput}
                    value={banca.iban}
                    maxLength={TEXT_SHORT}
                    onChange={(e) => patchRow(banca.id, { iban: sliceInputValue(e.target.value, TEXT_SHORT) })}
                    onBlur={() => void save()}
                    placeholder="IT00 X000 0000 0000 0000 0000 000"
                  />
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}

export function SettingsOfficinaProfiloSection() {
  const toast = useGestionaleToast();
  const settingsQ = useSharedAppSettingsQuery();
  const row = settingsQ?.data?.rows?.find(
    (r) => r.module === OFFICINA_PROFILO_MODULE && r.key === OFFICINA_PROFILO_KEY,
  );
  const [value, setValue] = useState<OfficinaProfiloOperativo>("attrezzature");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setValue(parseOfficinaProfiloOperativo(row?.value));
  }, [row?.value]);

  if (!settingsQ) return null;

  const disabled = pending || settingsQ.isPending;

  async function save(next: OfficinaProfiloOperativo) {
    if (next === value || disabled) return;
    setValue(next);
    setPending(true);
    const res = await settingsEntry.upsertSetting({
      module: OFFICINA_PROFILO_MODULE,
      key: OFFICINA_PROFILO_KEY,
      value: next as unknown as Record<string, unknown>,
      expectedUpdatedAt: row?.updated_at,
    });
    setPending(false);
    if (!res.success) {
      toast.error(res.error ?? "Errore salvataggio profilo officina.");
      setValue(parseOfficinaProfiloOperativo(row?.value));
      return;
    }
    toast.success("Profilo officina aggiornato.");
    await settingsQ?.refetch();
  }

  return (
    <div className="max-w-lg space-y-3">
      <p className="text-sm text-[var(--cab-text-muted)]">
        Definisce sezione telaio/attrezzatura nei form ingresso e target predefinito per nuove lavorazioni.
      </p>
      <fieldset className="min-w-0 space-y-2 border-0 p-0" disabled={disabled}>
        <legend className="mb-1 text-sm font-medium text-[var(--cab-text)]">Profilo operativo</legend>
        <div role="radiogroup" aria-label="Profilo operativo" className="space-y-2">
          {OPTIONS.map((opt) => {
            const active = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={disabled}
                onClick={() => void save(opt.value)}
                className={`${active ? profiloCardOn : profiloCardOff} ${dsFocus}`}
              >
                <span className="text-sm font-semibold text-[color:var(--cab-text)]">{opt.label}</span>
                <span className="text-xs leading-snug text-[color:var(--cab-text-muted)]">{opt.description}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
      <SettingsOfficinaSedeBlock
        settingKey={OFFICINA_SEDE_LEGALE_KEY}
        title="Sede legale"
        description="Indirizzo legale dell'azienda."
        disabled={disabled}
        onSaved={async () => {
          await settingsQ?.refetch();
        }}
      />
      <SettingsOfficinaSedeBlock
        settingKey={OFFICINA_SEDE_OPERATIVA_KEY}
        title="Sede operativa"
        description="Usata come indirizzo destinatario negli ordini fornitori (opzione «Magazzino»)."
        disabled={disabled}
        onSaved={async () => {
          await settingsQ?.refetch();
        }}
      />
      <SettingsOfficinaDestinatarioOrdiniAnagraficaBlock
        disabled={disabled}
        onSaved={async () => {
          await settingsQ?.refetch();
        }}
      />
      <SettingsOfficinaBancheOrdiniBlock
        disabled={disabled}
        onSaved={async () => {
          await settingsQ?.refetch();
        }}
      />
    </div>
  );
}
