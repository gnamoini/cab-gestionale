import type { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

type GestionaleToastApi = ReturnType<typeof useGestionaleToast>;

type RunActionOptions = {
  actionKey: string;
  successMessage?: string;
  errorContext?: Parameters<GestionaleToastApi["error"]>[1];
};

/**
 * Wrapper obbligatorio consigliato per nuove mutation lato UI:
 * - un solo success toast
 * - un solo error toast humanizzato
 */
export async function runGestionaleAction<T>(
  toast: GestionaleToastApi,
  run: () => Promise<T>,
  options: RunActionOptions,
): Promise<T | null> {
  try {
    const out = await run();
    if (options.successMessage) {
      toast.successOnce(options.actionKey, options.successMessage);
    }
    return out;
  } catch (e) {
    toast.errorOnce(options.actionKey, e, options.errorContext);
    return null;
  }
}
