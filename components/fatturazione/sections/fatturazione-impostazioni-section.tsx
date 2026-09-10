"use client";

import { useCallback, useEffect, useState } from "react";
import { ShellCard } from "@/components/gestionale/shell-card";
import { LoadingButton } from "@/components/design-system";
import { FormField } from "@/components/gestionale/schede/gestionale-form-section";
import { dsInput, dsTypoSectionTitle, dsTypoSmall } from "@/lib/ui/design-system";
import { COMPANY_FISCAL_PROFILE_COLUMNS } from "@/lib/db/table-select-columns";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

type Profile = {
  id?: string;
  ragione_sociale: string;
  partita_iva: string;
  codice_fiscale: string;
  indirizzo: string;
  cap: string;
  comune: string;
  provincia: string;
  nazione: string;
  pec: string;
  codice_destinatario: string;
  regime_fiscale: string;
};

const EMPTY: Profile = {
  ragione_sociale: "",
  partita_iva: "",
  codice_fiscale: "",
  indirizzo: "",
  cap: "",
  comune: "",
  provincia: "",
  nazione: "IT",
  pec: "",
  codice_destinatario: "",
  regime_fiscale: "RF01",
};

export function FatturazioneImpostazioniSection({ canWrite }: { canWrite: boolean }) {
  const toast = useGestionaleToast();
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getBrowserSupabase()
      .from("company_fiscal_profile")
      .select(COMPANY_FISCAL_PROFILE_COLUMNS)
      .eq("active", true)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        const row = data as Record<string, unknown>;
        setProfile({
          id: String(row.id ?? ""),
          ragione_sociale: String(row.ragione_sociale ?? ""),
          partita_iva: String(row.partita_iva ?? ""),
          codice_fiscale: String(row.codice_fiscale ?? ""),
          indirizzo: String(row.indirizzo ?? ""),
          cap: String(row.cap ?? ""),
          comune: String(row.comune ?? ""),
          provincia: String(row.provincia ?? ""),
          nazione: String(row.nazione ?? "IT"),
          pec: String(row.pec ?? ""),
          codice_destinatario: String(row.codice_destinatario ?? ""),
          regime_fiscale: String(row.regime_fiscale ?? "RF01"),
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(async () => {
    if (!canWrite || busy) return;
    if (!profile.ragione_sociale.trim()) {
      toast.validation("Ragione sociale obbligatoria.");
      return;
    }
    setBusy(true);
    try {
      const c = getBrowserSupabase();
      const payload = {
        ragione_sociale: profile.ragione_sociale.trim(),
        partita_iva: profile.partita_iva.trim() || null,
        codice_fiscale: profile.codice_fiscale.trim() || null,
        indirizzo: profile.indirizzo.trim() || null,
        cap: profile.cap.trim() || null,
        comune: profile.comune.trim() || null,
        provincia: profile.provincia.trim() || null,
        nazione: profile.nazione.trim() || "IT",
        pec: profile.pec.trim() || null,
        codice_destinatario: profile.codice_destinatario.trim() || null,
        regime_fiscale: profile.regime_fiscale.trim() || null,
        active: true,
      };
      const q = profile.id
        ? c.from("company_fiscal_profile").update(payload).eq("id", profile.id)
        : c.from("company_fiscal_profile").insert({
            ...payload,
            company_id: "00000000-0000-4000-8000-000000000001",
          });
      const { error } = await q;
      if (error) throw new Error(error.message);
      toast.successOnce("cfp-save", "Profilo fiscale salvato. Obbligatorio per emettere.");
    } catch (e) {
      toast.errorOnce("cfp-save", e);
    } finally {
      setBusy(false);
    }
  }, [busy, canWrite, profile, toast]);

  const field = (key: keyof Profile, label: string) => (
    <FormField label={label}>
      <input
        className={dsInput}
        value={profile[key] ?? ""}
        disabled={!canWrite}
        onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
      />
    </FormField>
  );

  return (
    <ShellCard>
      <h2 className={dsTypoSectionTitle}>Profilo fiscale cedente</h2>
      <p className={`${dsTypoSmall} mt-1`}>
        Obbligatorio per FINALIZE/EMIT. Bozze consentite senza profilo. Numerazione FT/NC/ND via document_number_sequences.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {field("ragione_sociale", "Ragione sociale")}
        {field("partita_iva", "Partita IVA")}
        {field("codice_fiscale", "Codice fiscale")}
        {field("regime_fiscale", "Regime fiscale")}
        {field("indirizzo", "Indirizzo")}
        {field("cap", "CAP")}
        {field("comune", "Comune")}
        {field("provincia", "Provincia")}
        {field("pec", "PEC")}
        {field("codice_destinatario", "Codice destinatario")}
      </div>
      {canWrite ? (
        <div className="mt-4">
          <LoadingButton type="button" variant="primary" loading={busy} onClick={() => void save()}>
            Salva profilo
          </LoadingButton>
        </div>
      ) : (
        <p className={`${dsTypoSmall} mt-3 text-[color:var(--cab-text-muted)]`}>Solo lettura — servono permessi di scrittura.</p>
      )}
    </ShellCard>
  );
}
