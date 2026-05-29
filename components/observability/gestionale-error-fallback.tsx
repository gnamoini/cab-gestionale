"use client";

import { erpBtnNeutral } from "@/components/gestionale/lavorazioni/lavorazioni-shared";

export type GestionaleErrorFallbackProps = {
  variant: "root" | "gestionale";
  message?: string;
  onRetry?: () => void;
};

export function GestionaleErrorFallback({ variant, message, onRetry }: GestionaleErrorFallbackProps) {
  const text =
    message?.trim() ||
    (variant === "gestionale"
      ? "Errore imprevisto nell’area gestionale. Puoi riprovare o tornare alla dashboard."
      : "Si è verificato un errore. Riprova tra qualche istante.");

  if (variant === "gestionale") {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 rounded-xl border border-red-200 bg-red-50/90 p-6 text-red-950 shadow-sm dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-50">
        <h1 className="text-base font-semibold">Qualcosa è andato storto</h1>
        <p className="text-sm leading-relaxed opacity-95">{text}</p>
        <div className="flex flex-wrap gap-2">
          {onRetry ? (
            <button type="button" className={erpBtnNeutral} onClick={() => onRetry()}>
              Riprova
            </button>
          ) : null}
          <a href="/dashboard" className={`${erpBtnNeutral} inline-flex no-underline`}>
            Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md rounded-xl border border-red-200 bg-red-50/90 p-6 text-red-950 shadow-sm dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-50">
        <h1 className="text-lg font-semibold">Errore applicazione</h1>
        <p className="mt-2 text-sm leading-relaxed opacity-95">{text}</p>
        {onRetry ? (
          <button
            type="button"
            className="mt-4 rounded-lg border border-red-300/60 bg-white px-4 py-2 text-sm font-semibold text-red-900 hover:bg-red-100/80 dark:border-red-800 dark:bg-red-950/50 dark:text-red-100 dark:hover:bg-red-900/40"
            onClick={() => onRetry()}
          >
            Riprova
          </button>
        ) : null}
      </div>
    </div>
  );
}
