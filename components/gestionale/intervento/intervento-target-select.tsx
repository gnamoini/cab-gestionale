"use client";

import type { AttrezzaturaGestita } from "@/lib/attrezzature/types";
import {
  dsFocus,
  dsInput,
  dsSegmentedBtnOff,
  dsSegmentedBtnOn,
  dsSegmentedWrap,
} from "@/lib/ui/design-system";
import type { InterventoTargetType } from "@/src/types/supabase-tables";

const segmentWrap = `${dsSegmentedWrap} w-full min-w-0 gap-0.5 p-0.5`;
const segmentOn = `${dsSegmentedBtnOn} min-w-0 flex-1 px-2.5 py-2 text-xs max-sm:min-h-11`;
const segmentOff = `${dsSegmentedBtnOff} min-w-0 flex-1 px-2.5 py-2 text-xs max-sm:min-h-11`;

const OPTIONS: { value: InterventoTargetType; label: string }[] = [
  { value: "telaio", label: "Telaio" },
  { value: "attrezzatura", label: "Attrezzatura" },
];

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
    <div className="space-y-2.5">
      <div className={segmentWrap} role="group" aria-label="Oggetto intervento">
        {OPTIONS.map(({ value: opt, label }) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => onChange(opt, opt === "telaio" ? null : attrezzature[0]?.id ?? null)}
              className={`${active ? segmentOn : segmentOff} ${dsFocus}`}
            >
              {label}
            </button>
          );
        })}
      </div>
      {value === "attrezzatura" && attrezzature.length > 0 ? (
        <select
          disabled={disabled}
          className={`block w-full ${dsInput}`}
          value={attrezzaturaId ?? attrezzature[0]?.id ?? ""}
          onChange={(e) => onChange("attrezzatura", e.target.value || null)}
          aria-label="Attrezzatura collegata al mezzo"
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
