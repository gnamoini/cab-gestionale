"use client";

import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  SETTINGS_FORM_FIELD_ROW,
  SETTINGS_SECTION_HINT,
  SettingsListFrame,
  SettingsListSection,
  type SettingsSectionLayout,
} from "@/components/dashboard/settings-list-ui";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { dsFocus } from "@/lib/ui/design-system";

type HealthScoreConfigResponse = {
  calculation?: {
    usePreventiviForMissingFatturazione?: boolean;
  };
  error?: string;
};

const FIELD_ID = "health-score-preventivi-fallback";

async function fetchHealthScoreCalculation(): Promise<boolean> {
  const res = await fetch("/api/dashboard/health-score/config", { credentials: "include" });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Configurazione non disponibile");
  }
  const json = (await res.json()) as HealthScoreConfigResponse;
  return json.calculation?.usePreventiviForMissingFatturazione !== false;
}

async function patchHealthScoreCalculation(enabled: boolean): Promise<void> {
  const res = await fetch("/api/dashboard/health-score/config", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      calculation: { usePreventiviForMissingFatturazione: enabled },
    }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Salvataggio non riuscito");
  }
}

export function SettingsHealthScoreSection({ layout = "flat" }: { layout?: SettingsSectionLayout }) {
  const gestToast = useGestionaleToast();
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

   
  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state in effect lifecycle
    setLoading(true);
    void fetchHealthScoreCalculation()
      .then((value) => {
        if (!cancelled) setEnabled(value);
      })
      .catch((e) => {
        if (!cancelled) gestToast.errorOnce("health-score-config-load", e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [gestToast]);

  const handleToggle = useCallback(
    async (next: boolean) => {
      const prev = enabled;
      setEnabled(next);
      setSaving(true);
      try {
        await patchHealthScoreCalculation(next);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["dashboard", "health-score", "v2"] }),
          queryClient.invalidateQueries({ queryKey: ["dashboard", "health-score", "history"] }),
        ]);
        gestToast.success("Impostazione Stato operativo aggiornata");
      } catch (e) {
        setEnabled(prev);
        gestToast.errorOnce("health-score-config-save", e);
      } finally {
        setSaving(false);
      }
    },
    [enabled, gestToast, queryClient],
  );

  return (
    <SettingsListSection
      layout={layout}
      title={layout === "card" ? "Stato operativo" : undefined}
      description={
        layout === "card"
          ? "Regole di calcolo del punteggio operativo in dashboard."
          : undefined
      }
    >
      <SettingsListFrame>
        <label htmlFor={FIELD_ID} className={`${SETTINGS_FORM_FIELD_ROW} cursor-pointer`}>
          <span className="flex min-w-0 flex-1 flex-col justify-center py-0.5">
            <span className="block text-sm font-semibold leading-snug text-[color:var(--cab-text)]">
              Usa preventivi inviati se manca fatturazione
            </span>
            <span className={`${SETTINGS_SECTION_HINT} mt-1 block max-w-xl`}>
              Nel calcolo dello Stato operativo, se fatturato o incassi risultano zero nel periodo, usa
              l&apos;importo dei preventivi inviati al cliente come stima (es. 10.000 € di preventivi
              confermati contano come fatturato e incassi finché non registri fatture).
            </span>
          </span>
          <span className="flex shrink-0 items-center sm:self-center">
            <input
              id={FIELD_ID}
              type="checkbox"
              className={`size-4 shrink-0 rounded border-[color:var(--cab-border)] ${dsFocus}`}
              checked={enabled}
              disabled={loading || saving}
              onChange={(e) => void handleToggle(e.target.checked)}
            />
          </span>
        </label>
      </SettingsListFrame>
    </SettingsListSection>
  );
}
