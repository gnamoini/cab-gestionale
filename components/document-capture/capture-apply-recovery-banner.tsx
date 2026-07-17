"use client";

import { LoadingButton } from "@/components/design-system";

type Props = {
  visible: boolean;
  busy: boolean;
  onResume: () => void;
};

export function CaptureApplyRecoveryBanner({ visible, busy, onResume }: Props) {
  if (!visible) return null;
  return (
    <div
      role="alert"
      className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <p className="font-medium">Import non completato</p>
      <p className="mt-1 text-xs sm:text-sm">
        La lavorazione potrebbe essere stata creata parzialmente. Puoi riprendere l&apos;operazione senza
        ricaricare il documento.
      </p>
      <div className="mt-3 flex justify-end">
        <LoadingButton type="button" variant="secondary" className="min-h-9" loading={busy} onClick={onResume}>
          Riprendi import
        </LoadingButton>
      </div>
    </div>
  );
}
