"use client";

import { useCallback, useEffect, useState } from "react";
import type { ValidationResult } from "@/lib/document-capture/model/validation-result";
import type { InterpretationModel } from "@/lib/document-capture/model/interpretation-model";
import type { DigitalDocument } from "@/lib/document-capture/model/document-model";

type Props = {
  captureId: string;
};

export function CaptureV41ReviewPanel({ captureId }: Props) {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [interpretation, setInterpretation] = useState<InterpretationModel | null>(null);
  const [document, setDocument] = useState<DigitalDocument | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const [vRes, iRes, dRes] = await Promise.all([
      fetch(`/api/document-capture/${captureId}/validation`),
      fetch(`/api/document-capture/${captureId}/interpretation`),
      fetch(`/api/document-capture/${captureId}/document-model`),
    ]);
    if (!vRes.ok || !iRes.ok || !dRes.ok) {
      setError("Dati v4.1 non disponibili");
      return;
    }
    const vBody = (await vRes.json()) as { validation: ValidationResult };
    const iBody = (await iRes.json()) as { interpretation: InterpretationModel };
    const dBody = (await dRes.json()) as { document: DigitalDocument };
    setValidation(vBody.validation);
    setInterpretation(iBody.interpretation);
    setDocument(dBody.document);
  }, [captureId]);

  useEffect(() => {
    void load();
  }, [load]);

  const flatFields = document?.pages.flatMap((p) =>
    p.sections.flatMap((s) => s.fields.map((f) => ({ key: f.key, value: f.value ?? "" }))),
  ) ?? [];

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-[color:var(--cab-danger)]">{error}</p> : null}
      {validation ? (
        <section>
          <h3 className="text-sm font-medium">Validazione ({validation.status})</h3>
          <ul className="mt-1 text-xs text-[color:var(--cab-muted)]">
            {validation.warnings.map((w) => (
              <li key={w.code}>{w.message}</li>
            ))}
            {validation.errors.map((e) => (
              <li key={e.code} className="text-[color:var(--cab-danger)]">
                {e.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {interpretation ? (
        <section>
          <h3 className="text-sm font-medium">Interpretazione</h3>
          <p className="text-xs text-[color:var(--cab-muted)]">
            {interpretation.suggestedActions[0]?.message ?? "—"}
          </p>
        </section>
      ) : null}
      <section>
        <h3 className="text-sm font-medium">DocumentModel (edit)</h3>
        <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">
          {flatFields.map((f) => (
            <label key={f.key} className="block text-xs">
              <span className="text-[color:var(--cab-muted)]">{f.key}</span>
              <input
                className="mt-0.5 w-full rounded border px-2 py-1 text-sm"
                value={f.value}
                disabled={busy}
                onChange={(e) => {
                  const next = e.target.value;
                  setDocument((prev) => {
                    if (!prev) return prev;
                    const copy = structuredClone(prev);
                    for (const page of copy.pages) {
                      for (const section of page.sections) {
                        for (const field of section.fields) {
                          if (field.key === f.key) field.value = next;
                        }
                      }
                    }
                    return copy;
                  });
                }}
                onBlur={() => {
                  void (async () => {
                    setBusy(true);
                    try {
                      await fetch(`/api/document-capture/${captureId}/document-model`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          patches: [{ fieldKey: f.key, newValue: f.value, overrideReason: "wizard_edit" }],
                        }),
                      });
                      await load();
                    } finally {
                      setBusy(false);
                    }
                  })();
                }}
              />
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
