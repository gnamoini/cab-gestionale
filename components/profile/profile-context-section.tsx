"use client";

import { LoadingFormSkeleton, TruncatedTextTooltip } from "@/components/design-system";
import { CabLogo } from "@/components/gestionale/cab-logo";
import { useBranding } from "@/context/branding-context";
import { formatSedeLine } from "@/lib/clienti/format-sede-line";
import { OFFICINA_LEGAL_NAME } from "@/lib/officina/officina-identity";
import { useClientePortalAnagrafica } from "@/src/hooks/gestionale/use-cliente-anagrafica";
import type { PublicAuthUser } from "@/src/types/auth-user";

function ContextInfoRow({ label, value, multilineTooltip = false }: { label: string; value: string; multilineTooltip?: boolean }) {
  if (!value.trim()) return null;
  return (
    <div className="flex justify-between gap-3 text-xs">
      <dt className="shrink-0 text-[color:var(--cab-text-muted)]">{label}</dt>
      <dd className="min-w-0 max-w-[62%] text-right">
        <TruncatedTextTooltip
          text={value}
          side="top"
          multiline={multilineTooltip}
          className="truncate text-[color:var(--cab-text)]"
        />
      </dd>
    </div>
  );
}

function OfficinaContextSection() {
  const { isCustomLogo } = useBranding();
  const legalName = OFFICINA_LEGAL_NAME.trim();
  if (!legalName && !isCustomLogo) return null;

  return (
    <section aria-labelledby="profile-officina-heading">
      <h3 id="profile-officina-heading" className="text-sm font-semibold text-[color:var(--cab-text)]">
        Officina
      </h3>
      <div className="mt-2 space-y-3 rounded-xl border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-3">
        {isCustomLogo ? (
          <div className="flex justify-start">
            <CabLogo height={32} priority={false} />
          </div>
        ) : null}
        <dl className="space-y-2">
          <ContextInfoRow label="Ragione sociale" value={legalName} />
        </dl>
      </div>
    </section>
  );
}

function ClienteContextSection({ clienteRef }: { clienteRef: string }) {
  const { data, isLoading, isError, error } = useClientePortalAnagrafica(clienteRef, true);

  if (isLoading) {
    return (
      <section aria-labelledby="profile-cliente-heading" aria-busy="true">
        <h3 id="profile-cliente-heading" className="text-sm font-semibold text-[color:var(--cab-text)]">
          La tua azienda
        </h3>
        <div className="mt-2 rounded-xl border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-3">
          <LoadingFormSkeleton fields={3} />
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section aria-labelledby="profile-cliente-heading">
        <h3 id="profile-cliente-heading" className="text-sm font-semibold text-[color:var(--cab-text)]">
          La tua azienda
        </h3>
        <p className="mt-2 rounded-xl border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-3 text-xs text-[color:var(--cab-danger)]">
          {error instanceof Error ? error.message : "Impossibile caricare l'anagrafica."}
        </p>
      </section>
    );
  }

  const anag = data;
  const aziendaNome =
    anag?.ragioneSociale?.trim() || anag?.nomeDisplay?.trim() || clienteRef;
  const ragione =
    anag?.ragioneSociale?.trim() &&
    anag.nomeDisplay?.trim() &&
    anag.ragioneSociale.trim() !== anag.nomeDisplay.trim()
      ? anag.ragioneSociale.trim()
      : "";
  const codice = anag?.entityKey?.trim() ?? "";
  const sedeOperativa = anag ? formatSedeLine(anag.sedi.operativa) : "";
  const sedeLegale =
    anag && !anag.sedeLegaleUgualeOperativa ? formatSedeLine(anag.sedi.legale) : "";
  const sede = sedeOperativa || sedeLegale;

  return (
    <section aria-labelledby="profile-cliente-heading">
      <h3 id="profile-cliente-heading" className="text-sm font-semibold text-[color:var(--cab-text)]">
        La tua azienda
      </h3>
      <dl className="mt-2 space-y-2 rounded-xl border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-3">
        <ContextInfoRow label="Azienda" value={aziendaNome} />
        <ContextInfoRow label="Ragione sociale" value={ragione} />
        <ContextInfoRow label="Codice" value={codice} />
        <ContextInfoRow label="Sede principale" value={sede} multilineTooltip />
      </dl>
    </section>
  );
}

export function ProfileContextSection({ user }: { user: PublicAuthUser }) {
  if (user.ruolo === "cliente") {
    const ref = user.clienteRef?.trim();
    if (!ref) return null;
    return <ClienteContextSection clienteRef={ref} />;
  }
  return <OfficinaContextSection />;
}
