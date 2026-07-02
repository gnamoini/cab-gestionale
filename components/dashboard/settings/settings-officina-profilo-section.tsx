"use client";

import { useEffect, useState } from "react";
import {
  OFFICINA_PROFILO_KEY,
  OFFICINA_PROFILO_MODULE,
  parseOfficinaProfiloOperativo,
  type OfficinaProfiloOperativo,
} from "@/lib/officina/officina-profilo-operativo";
import { useSharedAppSettingsQuery } from "@/src/context/app-settings-query-context";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { settingsService } from "@/src/services/settings.service";
import { dsInput } from "@/lib/ui/design-system";

const OPTIONS: { value: OfficinaProfiloOperativo; label: string }[] = [
  { value: "attrezzature", label: "Solo attrezzature" },
  { value: "telai", label: "Solo telai" },
  { value: "misto", label: "Misto (telaio + attrezzature)" },
];

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

  async function save(next: OfficinaProfiloOperativo) {
    setValue(next);
    setPending(true);
    const res = await settingsService.upsertSetting({
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
      <label className="block text-sm font-medium text-[var(--cab-text)]" htmlFor="officina-profilo-select">
        Profilo operativo
      </label>
      <select
        id="officina-profilo-select"
        className={`block w-full ${dsInput}`}
        value={value}
        disabled={pending || settingsQ.isPending}
        onChange={(e) => void save(parseOfficinaProfiloOperativo(e.target.value))}
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
