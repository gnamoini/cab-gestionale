"use client";

import { CloseButton } from "@/components/design-system/close-button";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import {
  IconMail,
  IconPhone,
  IconWhatsApp,
} from "@/components/lavorazioni-clienti/client-lavorazioni-icons";
import {
  CLIENT_PORTAL_CONTACT,
  openNativeContactHref,
} from "@/lib/lavorazioni/client-portal-contact";
import {
  dsBtnNeutral,
  dsBtnPrimary,
  dsLabel,
  dsLavorazioniModalWindowHeader,
  dsModalCloseBtn,
  dsModalHeaderInner,
  dsModalHeaderLead,
  dsModalTitle,
  dsModalTitleBlock,
} from "@/lib/ui/design-system";

const CONTATTACI_TITLE_ID = "client-contattaci-title";
const CONTATTACI_BTN_ICON = "h-4 w-4 shrink-0 opacity-90";

function ClientContattaciModalHeader({ onClose }: { onClose: () => void }) {
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
        <CloseButton
          onClick={onClose}
          className={dsModalCloseBtn}
          showOnFocus={false}
          data-testid="smoke-contattaci-close"
        />
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
      header={<ClientContattaciModalHeader onClose={onClose} />}
    >
      <GestionaleModalScrollBody className="flex min-w-0 flex-col gap-5">
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

        <div className="flex w-full min-w-0 flex-col gap-2">
          <a
            href={telHref}
            className={`${dsBtnPrimary} min-h-11 w-full touch-manipulation`}
            aria-label={`Chiama ${phoneDisplay}`}
            data-testid="smoke-contattaci-call"
          >
            <IconPhone className={CONTATTACI_BTN_ICON} />
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
            <IconWhatsApp className={CONTATTACI_BTN_ICON} />
            WhatsApp
          </a>
          <a
            href={mailtoHref}
            className={`${dsBtnNeutral} min-h-11 w-full touch-manipulation`}
            aria-label={`Invia email a ${email}`}
            data-testid="smoke-contattaci-email"
            onClick={(e) => {
              e.stopPropagation();
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
              e.preventDefault();
              openNativeContactHref(mailtoHref);
            }}
          >
            <IconMail className={CONTATTACI_BTN_ICON} />
            Email
          </a>
        </div>
      </GestionaleModalScrollBody>
    </LavorazioniModalShell>
  );
}
