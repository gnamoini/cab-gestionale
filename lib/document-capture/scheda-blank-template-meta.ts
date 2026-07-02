import { createHash } from "node:crypto";
import {
  SCHEDA_BLANK_TEMPLATE_VERSION,
  type SchedaBlankTipo,
} from "@/lib/pdf/schede-blank-layout";

export function computeSchedaBlankRendererHash(tipo: SchedaBlankTipo): string {
  const canonical = `${tipo}|${SCHEDA_BLANK_TEMPLATE_VERSION}|schede-blank-layout|1`;
  return createHash("sha256").update(canonical).digest("hex");
}

export const SCHEDA_BLANK_RENDERER_HASH: Record<SchedaBlankTipo, string> = {
  ingresso: computeSchedaBlankRendererHash("ingresso"),
  lavorazioni: computeSchedaBlankRendererHash("lavorazioni"),
  ricambi: computeSchedaBlankRendererHash("ricambi"),
};
