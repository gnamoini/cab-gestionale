import type { SchedaIngressoFields, SchedaLavorazioniFields } from "@/types/schede";

/** Token univoco per run E2E audit (evita collisioni in DB locale). */
export function uniqueAuditToken(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `AUDIT-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export type SchedaIngressoAuditFixture = {
  token: string;
  ingresso: SchedaIngressoFields;
  ingressoEdit: Partial<SchedaIngressoFields>;
  lavorazioni: Pick<SchedaLavorazioniFields, "identificazioneMacchina"> & {
    riga: {
      dataLavorazione: string;
      lavorazioniEffettuate: string;
      addettoOre: number;
    };
  };
};

export function buildSchedaIngressoAuditFixture(token = uniqueAuditToken()): SchedaIngressoAuditFixture {
  const ingresso: SchedaIngressoFields = {
    dataIngresso: "09/06/2026",
    cliente: `Cliente ${token}`,
    cantiere: `Cantiere ${token}`,
    utilizzatore: `Util ${token}`,
    tipoAttrezzatura: `TipoAtt ${token}`,
    marcaAttrezzatura: `MARCA-${token}`,
    modelloAttrezzatura: `MOD-${token}`,
    matricola: `MAT-${token}`,
    nScuderia: `SCU-${token.slice(-4)}`,
    oreLavoro: "1234.5",
    tipoTelaio: `TelaioTipo ${token}`,
    marcaTelaio: `MARCA-T-${token}`,
    modelloTelaio: `MOD-T-${token}`,
    targa: `ZZ${token.slice(-3).replace(/\D/g, "9")}XX`.slice(0, 7),
    km: "56789",
    descrizioneAnomalia: `Riga1 ${token}\nRiga2 🛠 àèù & < >`,
    livelloCarburante: "3/4",
    addettoAccettazione: "",
    richiedente: `Richiedente ${token}`,
    noteIntervento: `Nota ${token}\nseconda riga\temoji 🛠`,
  };

  const ingressoEdit: Partial<SchedaIngressoFields> = {
    cliente: `Cliente ${token}-EDIT`,
    cantiere: `Cantiere ${token}-EDIT`,
    utilizzatore: `Util ${token}-EDIT`,
    richiedente: `Richiedente ${token}-EDIT`,
    noteIntervento: `Nota ${token}-EDIT\nedit riga 2`,
    descrizioneAnomalia: `Anomalia ${token}-EDIT\nriga 2`,
    km: "99999",
    oreLavoro: "2000",
  };

  return {
    token,
    ingresso,
    ingressoEdit,
    lavorazioni: {
      identificazioneMacchina: `ID-MAC-${token}`,
      riga: {
        dataLavorazione: "10/06/2026",
        lavorazioniEffettuate: `Lavoro ${token}\nseconda riga`,
        addettoOre: 2.5,
      },
    },
  };
}

/** Campi ingresso attesi nel JSON `contenuto.doc.campi` (scheda_lavorazione). */
export const SCHEDA_INGRESSO_DB_KEYS = [
  "dataIngresso",
  "cliente",
  "cantiere",
  "utilizzatore",
  "tipoAttrezzatura",
  "marcaAttrezzatura",
  "modelloAttrezzatura",
  "matricola",
  "nScuderia",
  "oreLavoro",
  "tipoTelaio",
  "marcaTelaio",
  "modelloTelaio",
  "targa",
  "km",
  "descrizioneAnomalia",
  "livelloCarburante",
  "addettoAccettazione",
  "richiedente",
  "noteIntervento",
] as const satisfies readonly (keyof SchedaIngressoFields)[];
