import { createHash } from "node:crypto";
import {
  SCHEDA_BLANK_TEMPLATE_VERSION,
  type SchedaBlankTipo,
} from "@/lib/pdf/schede-blank-layout";

const LAYOUT_REVISION: Record<SchedaBlankTipo, number> = {
  ingresso: 1,
  lavorazioni: 2,
  ricambi: 2,
};

export function computeSchedaBlankRendererHash(tipo: SchedaBlankTipo): string {
  const canonical = `${tipo}|${SCHEDA_BLANK_TEMPLATE_VERSION}|schede-blank-layout|${LAYOUT_REVISION[tipo]}`;
  return createHash("sha256").update(canonical).digest("hex");
}

export const SCHEDA_BLANK_RENDERER_HASH: Record<SchedaBlankTipo, string> = {
  ingresso: computeSchedaBlankRendererHash("ingresso"),
  lavorazioni: computeSchedaBlankRendererHash("lavorazioni"),
  ricambi: computeSchedaBlankRendererHash("ricambi"),
};
