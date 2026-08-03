"use client";

import { GestionaleTextarea } from "@/components/gestionale/gestionale-textarea";
import { FormField } from "@/components/gestionale/schede/gestionale-form-section";
import {
  preventivoEditorPanelClass,
  preventivoEditorSubsectionTitle,
} from "@/components/preventivi/preventivo-editor-ui";
import {
  fmtPreventivoEuro,
  PreventivoEditorRiepilogoRow,
  PreventivoEditorTotalBar,
} from "@/components/preventivi/preventivo-editor-totals";
import { CAB_FOCUS_SCROLL_GROUP_ATTR } from "@/lib/ui/mobile-modal-behavior";
import {
  PREVENTIVO_SMALTIMENTO_DESCRIZIONE,
  PREVENTIVO_SMALTIMENTO_PERCENT,
} from "@/lib/preventivi/preventivi-voci-standard";
import { PDF_PREVENTIVO_IVA_PERCENT } from "@/lib/pdf/preventivo-pdf-layout";
import { sliceInputValue, TEXT_LONG } from "@/lib/validation/text-field-limits";

export function PreventivoRiepilogoNoteSection({
  totaleSmaltimento,
  netto,
  importoIva,
  totaleConIva,
  noteFinali,
  noteFieldId,
  onNoteChange,
}: {
  totaleSmaltimento: number;
  netto: number;
  importoIva: number;
  totaleConIva: number;
  noteFinali: string;
  noteFieldId: string;
  onNoteChange: (note: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div {...{ [CAB_FOCUS_SCROLL_GROUP_ATTR]: "" }} className="space-y-2">
        <h3 className={preventivoEditorSubsectionTitle}>Riepilogo economico</h3>
        <div className={preventivoEditorPanelClass}>
          <PreventivoEditorRiepilogoRow
            label={`${PREVENTIVO_SMALTIMENTO_DESCRIZIONE} (${PREVENTIVO_SMALTIMENTO_PERCENT}% netto)`}
            value={fmtPreventivoEuro(totaleSmaltimento)}
          />
        </div>
        <PreventivoEditorTotalBar label="Totale netto" value={fmtPreventivoEuro(netto)} />
        <div className={preventivoEditorPanelClass}>
          <PreventivoEditorRiepilogoRow
            label={`IVA (${PDF_PREVENTIVO_IVA_PERCENT}%)`}
            value={fmtPreventivoEuro(importoIva)}
          />
        </div>
        <PreventivoEditorTotalBar
          label="Totale con IVA"
          value={fmtPreventivoEuro(totaleConIva)}
          emphasis="grand"
        />
      </div>

      <div {...{ [CAB_FOCUS_SCROLL_GROUP_ATTR]: "" }} className="space-y-2">
        <FormField label="Note finali" htmlFor={noteFieldId}>
          <GestionaleTextarea
            id={noteFieldId}
            className="min-h-[4rem]"
            size="md"
            value={noteFinali}
            onChange={(v) => onNoteChange(sliceInputValue(v, TEXT_LONG))}
            maxLength={TEXT_LONG}
          />
        </FormField>
      </div>
    </div>
  );
}
