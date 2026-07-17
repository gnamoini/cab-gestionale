import "server-only";

import { createLanguageModel } from "@/lib/ai/runtime/providers/google";
import type { AiProviderId } from "@/lib/ai/runtime/types";

export { createLanguageModel };

export function isProviderImplemented(provider: AiProviderId): boolean {
  return provider === "google";
}
