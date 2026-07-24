import { labelMarcaToken } from "@/lib/inventory-labels/domain/label-display";
import type { LabelPayload } from "@/lib/inventory-labels/domain/types";

export type ManualLabelInput = {
  marca?: string;
  descrizione?: string;
  codice?: string;
};

export function labelPayloadFromManualInput(input: ManualLabelInput): LabelPayload {
  return {
    marca: labelMarcaToken(input.marca ?? ""),
    marcaSecondaria: "",
    descrizione: (input.descrizione ?? "").trim(),
    codice: (input.codice ?? "").trim(),
    codiceSecondario: "",
    fornitoriAlternativi: [],
    fornitoreAlternativo: "",
    codiceAlternativo: "",
  };
}
