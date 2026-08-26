"use client";

import type { DocumentoGestionale } from "@/lib/types/gestionale";

const KIND_OPTIONS: Array<{ value: NonNullable<DocumentoGestionale["aiDocumentKind"]>; label: string }> = [
  { value: "spare_parts_catalog", label: "Catalogo ricambi" },
  { value: "price_list", label: "Listino" },
  { value: "oem_manual", label: "Manuale OEM" },
  { value: "exploded_view", label: "Esploso" },
  { value: "other", label: "Altro" },
];

export function DocumentSparePartsFields({
  enabled,
  onEnabledChange,
  documentKind,
  onDocumentKindChange,
  priceEnabled,
  onPriceEnabledChange,
  disabled,
}: {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  documentKind: DocumentoGestionale["aiDocumentKind"];
  onDocumentKindChange: (v: DocumentoGestionale["aiDocumentKind"]) => void;
  priceEnabled: boolean;
  onPriceEnabledChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-[color:var(--cab-border)] p-3">
      <label className="flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          disabled={disabled}
        />
        <span className="text-sm text-[color:var(--cab-text)]">Usa per Identifica ricambio (Ricambi AI)</span>
      </label>
      {enabled ? (
        <>
          <label className="block text-xs text-[color:var(--cab-text-muted)]">
            Tipo documento AI
            <select
              className="mt-1 w-full rounded-md border border-[color:var(--cab-border)] bg-[var(--cab-surface)] px-2 py-1.5 text-sm"
              value={documentKind ?? "spare_parts_catalog"}
              onChange={(e) => onDocumentKindChange(e.target.value as DocumentoGestionale["aiDocumentKind"])}
              disabled={disabled}
            >
              {KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={priceEnabled}
              onChange={(e) => onPriceEnabledChange(e.target.checked)}
              disabled={disabled}
            />
            Estrai prezzi (listino)
          </label>
        </>
      ) : null}
    </div>
  );
}
