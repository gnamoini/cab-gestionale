"use server";

import {
  completeLavorazioneTagliando,
  type CompleteLavorazioneTagliandoInput,
  type CompleteLavorazioneTagliandoResult,
} from "@/lib/maintenance-plans/complete-lavorazione-tagliando.server";

export async function completeLavorazioneTagliandoAction(
  input: CompleteLavorazioneTagliandoInput,
): Promise<CompleteLavorazioneTagliandoResult> {
  return completeLavorazioneTagliando(input);
}
