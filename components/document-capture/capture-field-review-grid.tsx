"use client";

import { useCallback, useEffect, useState } from "react";
import { dsBtnNeutral, dsBtnPrimary } from "@/lib/ui/design-system";

type FieldRow = {
  field_key: string;
  normalized_value: string | null;
  confirmed_value: string | null;
  confidence: number | null;
  value_source: string;
};

export function CaptureFieldReviewGrid({ captureId }: { captureId: string }) {
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/document-capture/${captureId}/fields`);
    if (!res.ok) return;
    const body = (await res.json()) as { fields?: FieldRow[] };
    const rows = body.fields ?? [];
    setFields(rows);
    const next: Record<string, string> = {};
    for (const f of rows) {
      next[f.field_key] = f.confirmed_value ?? f.normalized_value ?? "";
    }
    setDraft(next);
  }, [captureId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveConfirmed = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/document-capture/${captureId}/fields`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: Object.entries(draft).map(([fieldKey, confirmedValue]) => ({
            fieldKey,
            confirmedValue: confirmedValue.trim() || null,
            valueSource: "manual" as const,
          })),
        }),
      });
      if (!res.ok) throw new Error("Salvataggio campi fallito");
      setSaved(true);
      await load();
    } finally {
      setSaving(false);
    }
  }, [captureId, draft, load]);

  if (fields.length === 0) {
    return <p className="text-sm text-[color:var(--cab-muted-fg)]">Campi estratti disponibili dopo analyze.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        {fields.map((f) => {
          const tier =
            (f.confidence ?? 0) >= 0.85 ? "alta" : (f.confidence ?? 0) >= 0.6 ? "media" : "bassa";
          return (
            <label
              key={f.field_key}
              className="grid gap-1 rounded border border-[color:var(--cab-border)] p-2 text-sm"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-medium">{f.field_key}</span>
                <span className="text-xs uppercase text-[color:var(--cab-muted-fg)]">{tier}</span>
              </span>
              <input
                className="rounded border border-[color:var(--cab-border)] px-2 py-1"
                value={draft[f.field_key] ?? ""}
                onChange={(e) => setDraft((cur) => ({ ...cur, [f.field_key]: e.target.value }))}
              />
            </label>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className={dsBtnPrimary} disabled={saving} onClick={() => void saveConfirmed()}>
          Conferma campi
        </button>
        {saved ? <span className="text-xs text-[color:var(--cab-success-fg)]">Salvato</span> : null}
        <button type="button" className={dsBtnNeutral} disabled={saving} onClick={() => void load()}>
          Ricarica
        </button>
      </div>
    </div>
  );
}
