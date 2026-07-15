import type { PwaDisplayMode } from "@/lib/pwa/pwa-display-mode";
import { isPwaStandaloneMode } from "@/lib/pwa/pwa-display-mode";
import type { PwaPlatform } from "@/lib/pwa/pwa-platform";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export type PwaInstallUiVariant = "none" | "native" | "ios-hint";

export type PwaInstallPromptOutcome = "accepted" | "dismissed" | "unavailable";

export function resolvePwaInstallUiVariant(input: {
  platform: PwaPlatform;
  displayMode: PwaDisplayMode;
  hasDeferredPrompt: boolean;
  dismissed: boolean;
  installMarked: boolean;
  engagementElapsed: boolean;
}): PwaInstallUiVariant {
  if (isPwaStandaloneMode(input.displayMode) || input.installMarked) return "none";
  if (input.dismissed) return "none";
  if (!input.engagementElapsed) return "none";
  if (input.hasDeferredPrompt) return "native";
  if (input.platform === "ios") return "ios-hint";
  return "none";
}

/** Menu profilo: offre install anche se il banner è stato chiuso con «Non ora». */
export function resolvePwaInstallMenuAvailable(input: {
  platform: PwaPlatform;
  displayMode: PwaDisplayMode;
  hasDeferredPrompt: boolean;
  installMarked: boolean;
}): boolean {
  if (isPwaStandaloneMode(input.displayMode) || input.installMarked) return false;
  if (input.hasDeferredPrompt) return true;
  if (input.platform === "ios") return true;
  return false;
}
