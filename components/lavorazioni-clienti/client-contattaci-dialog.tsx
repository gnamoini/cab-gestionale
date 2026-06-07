"use client";

import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { GestionaleModalScrollBody, gestionaleModalScrollContentPad } from "@/components/gestionale/mobile-modal-scroll-body";
import { CLIENT_PORTAL_CONTACT } from "@/lib/lavorazioni/client-portal-contact";
import { dsBtnNeutral, dsBtnPrimary, dsModalFormFooter } from "@/lib/ui/design-system";

export function ClientContattaciDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  const { email, phoneDisplay, telHref, mailtoHref, whatsappHref } = CLIENT_PORTAL_CONTACT;

  return (
    <LavorazioniModalShell modalSize="info" onRequestClose={onClose} title="Contattaci">
      <GestionaleModalScrollBody className="min-h-0 min-w-0 flex-1">
        <div className={`${gestionaleModalScrollContentPad} flex flex-col gap-5`}>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Per assistenza puoi contattarci telefonicamente, via WhatsApp o email.
          </p>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Email
              </span>
              <a
                href={mailtoHref}
                className="break-all text-sm font-medium text-[color:var(--cab-primary)] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--cab-primary)_26%,transparent)]"
              >
                {email}
              </a>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Telefono
              </span>
              <a
                href={telHref}
                className="text-sm font-medium text-[color:var(--cab-primary)] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--cab-primary)_26%,transparent)]"
              >
                {phoneDisplay}
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <a
              href={telHref}
              className={`${dsBtnPrimary} min-h-11 w-full touch-manipulation`}
              aria-label={`Chiama ${phoneDisplay}`}
            >
              Chiama
            </a>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`${dsBtnNeutral} min-h-11 w-full touch-manipulation`}
              aria-label="Scrivi su WhatsApp"
            >
              WhatsApp
            </a>
            <a
              href={mailtoHref}
              className={`${dsBtnNeutral} min-h-11 w-full touch-manipulation`}
              aria-label={`Invia email a ${email}`}
            >
              Email
            </a>
          </div>
        </div>
      </GestionaleModalScrollBody>

      <footer className={dsModalFormFooter}>
        <button type="button" className={`${dsBtnNeutral} min-h-11`} onClick={onClose}>
          Chiudi
        </button>
      </footer>
    </LavorazioniModalShell>
  );
}
