"use client";

import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { CLIENT_PORTAL_CONTACT } from "@/lib/lavorazioni/client-portal-contact";
import {
  dsBtnNeutral,
  dsBtnPrimary,
  dsLabel,
  dsLavorazioniModalWindowHeader,
  dsModalHeaderInner,
  dsModalHeaderLead,
  dsModalTitle,
  dsModalTitleBlock,
} from "@/lib/ui/design-system";

const CONTATTACI_TITLE_ID = "client-contattaci-title";

function ClientContattaciModalHeader() {
  return (
    <header className={dsLavorazioniModalWindowHeader}>
      <div className={dsModalHeaderInner}>
        <div className={dsModalHeaderLead}>
          <div className={dsModalTitleBlock}>
            <h2 id={CONTATTACI_TITLE_ID} className={dsModalTitle}>
              Contattaci
            </h2>
          </div>
        </div>
      </div>
    </header>
  );
}

export function ClientContattaciDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  const { email, phoneDisplay, telHref, mailtoHref, whatsappHref } = CLIENT_PORTAL_CONTACT;

  return (
    <LavorazioniModalShell
      modalSize="info"
      onRequestClose={onClose}
      titleId={CONTATTACI_TITLE_ID}
      header={<ClientContattaciModalHeader />}
      footer={
        <div className="flex w-full flex-col gap-2">
          <a
            href={telHref}
            className={`${dsBtnPrimary} min-h-11 w-full touch-manipulation`}
            aria-label={`Chiama ${phoneDisplay}`}
            data-testid="smoke-contattaci-call"
          >
            Chiama
          </a>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`${dsBtnNeutral} min-h-11 w-full touch-manipulation`}
            aria-label="Scrivi su WhatsApp"
            data-testid="smoke-contattaci-whatsapp"
          >
            WhatsApp
          </a>
          <a
            href={mailtoHref}
            className={`${dsBtnNeutral} min-h-11 w-full touch-manipulation`}
            aria-label={`Invia email a ${email}`}
            data-testid="smoke-contattaci-email"
          >
            Email
          </a>
          <button
            type="button"
            className={`${dsBtnNeutral} min-h-11 w-full touch-manipulation`}
            onClick={onClose}
            data-testid="smoke-contattaci-close"
          >
            Chiudi
          </button>
        </div>
      }
    >
      <GestionaleModalScrollBody className="flex flex-col gap-5">
          <p className="text-sm text-[color:var(--cab-text-muted)]">
            Per assistenza puoi contattarci telefonicamente, via WhatsApp o email.
          </p>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className={dsLabel}>Email</span>
              <p className="break-all text-sm font-medium text-[color:var(--cab-text)]">{email}</p>
            </div>
            <div className="flex flex-col gap-1">
              <span className={dsLabel}>Telefono</span>
              <p className="text-sm font-medium text-[color:var(--cab-text)]">{phoneDisplay}</p>
            </div>
          </div>
      </GestionaleModalScrollBody>
    </LavorazioniModalShell>
  );
}
