"use client";

import { dsBtnNeutral } from "@/lib/ui/design-system";

const BLANK_TYPES = [
  { tipo: "scheda-ingresso-blank", label: "Scheda ingresso" },
  { tipo: "scheda-lavorazioni-blank", label: "Scheda lavorazioni" },
  { tipo: "scheda-ricambi-blank", label: "Scheda ricambi" },
] as const;

export function SchedaBlankPdfActions() {
  return (
    <div className="flex flex-wrap gap-2">
      {BLANK_TYPES.map((item) => (
        <a
          key={item.tipo}
          className={dsBtnNeutral}
          href={`/api/pdf/artifacts/scheda-blank/${item.tipo}`}
          target="_blank"
          rel="noreferrer"
        >
          {item.label}
        </a>
      ))}
    </div>
  );
}
