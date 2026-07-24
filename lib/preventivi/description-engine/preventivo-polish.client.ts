import type { PolishGuardContext } from "@/lib/preventivi/description-engine/polish-guard";
import type { PreventivoPolishResult } from "@/lib/preventivi/description-engine/preventivo-polish.server";

export type PreventivoPolishClientInput = {
  description: string;
  technicalFingerprint: string;
  guardContext: PolishGuardContext;
};

export async function polishPreventivoDescriptionClient(
  input: PreventivoPolishClientInput,
): Promise<PreventivoPolishResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch("/api/preventivi/description-polish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    if (!res.ok) {
      return {
        attempted: true,
        applied: false,
        fallback: true,
        text: input.description,
        reason: "provider_error",
        cacheHit: false,
        durationMs: 0,
        model: "gemini-3.5-flash",
      };
    }

    const data = (await res.json()) as PreventivoPolishResult;
    if (!data.attempted) {
      return {
        attempted: true,
        applied: false,
        fallback: true,
        text: input.description,
        reason: "provider_error",
        cacheHit: false,
        durationMs: data.durationMs ?? 0,
        model: data.model ?? "gemini-3.5-flash",
      };
    }
    return data;
  } catch {
    return {
      attempted: true,
      applied: false,
      fallback: true,
      text: input.description,
      reason: "timeout",
      cacheHit: false,
      durationMs: 0,
      model: "gemini-3.5-flash",
    };
  } finally {
    clearTimeout(timeout);
  }
}
