import { isSchedaIngressoFieldEmpty } from "@/lib/schede/scheda-ingresso-typed-fields";
import type { SchedaIngressoFields } from "@/types/schede";
import type { InterventoContext } from "@/lib/domain/intervento-context/intervento-context.types";

/** Scheda di Ingresso record exists (campi snapshot available), regardless of field values. */
export function schedaIngressoRecordExists(ctx: InterventoContext): boolean {
  return ctx.schedaIngresso.campi !== null;
}

export type SchedaIngressoFieldReadState = "valorizzato" | "vuoto" | "bootstrap";

/** A: valorizzato | B: vuoto (scheda presente) | C: bootstrap (scheda assente). */
export function schedaIngressoFieldReadState(
  ctx: InterventoContext,
  key: keyof SchedaIngressoFields,
): SchedaIngressoFieldReadState {
  if (!schedaIngressoRecordExists(ctx)) return "bootstrap";
  const campi = ctx.schedaIngresso.campi!;
  if (!isSchedaIngressoFieldEmpty(key, campi[key])) return "valorizzato";
  return "vuoto";
}
