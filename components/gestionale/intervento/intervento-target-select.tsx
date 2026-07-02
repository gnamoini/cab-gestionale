"use client";

import type { InterventoTargetType } from "@/src/types/supabase-tables";
import type { AttrezzaturaGestita } from "@/lib/attrezzature/types";

export function InterventoTargetSelect({
  value,
  attrezzaturaId = null,
  onChange,
  attrezzature,
  disabled = false,
}: {
  value: InterventoTargetType;
  attrezzaturaId?: string | null;
  onChange: (v: InterventoTargetType, attrezzaturaId: string | null) => void;
  attrezzature: readonly AttrezzaturaGestita[];
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {(["telaio", "attrezzatura"] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt, opt === "telaio" ? null : attrezzature[0]?.id ?? null)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ring-1 transition ${
              value === opt
                ? "bg-[var(--cab-accent)] text-white ring-[var(--cab-accent)]"
                : "bg-[var(--cab-card)] text-[var(--cab-text-muted)] ring-[var(--cab-border)] hover:text-[var(--cab-text)]"
            }`}
          >
            {opt === "telaio" ? "Telaio" : "Attrezzatura"}
          </button>
        ))}
      </div>
      {value === "attrezzatura" && attrezzature.length > 0 ? (
        <select
          disabled={disabled}
          className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          value={attrezzaturaId ?? attrezzature[0]?.id ?? ""}
          onChange={(e) => onChange("attrezzatura", e.target.value || null)}
        >
          {attrezzature.map((a) => (
            <option key={a.id} value={a.id}>
              {[a.marca, a.modello].filter(Boolean).join(" ")}
              {a.matricola !== "Non assegnata" ? ` · ${a.matricola}` : ""}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}
