import type { ReactNode } from "react";
import { dsTypoBody } from "@/lib/ui/design-system";

export type PrivacyPolicySection = {
  id: string;
  title: string;
  body: ReactNode;
};

const bodyClass = dsTypoBody;
const listClass = `${bodyClass} list-disc space-y-1 pl-5`;
const subTitleClass = "text-sm font-semibold text-[color:var(--cab-text)]";

function P({ children }: { children: ReactNode }) {
  return <p className={bodyClass}>{children}</p>;
}

function Ul({ children }: { children: ReactNode }) {
  return <ul className={listClass}>{children}</ul>;
}

export const PRIVACY_POLICY_LAST_UPDATED = "5 luglio 2026";

export const privacyPolicySections: PrivacyPolicySection[] = [
  {
    id: "privacy-titolare",
    title: "1. Titolare del trattamento",
    body: (
      <>
        <P>
          <strong>Denominazione:</strong> Centro Assistenza Bari SRL
        </P>
        <P>
          <strong>Sede legale:</strong> Via dei Lilium , 70026 Modugno
        </P>
        <P>
          <strong>P. IVA / C.F.:</strong> 06426130727
        </P>
        <P>
          <strong>Email:</strong> service@autocompattatori.it
        </P>
        <P>
          <strong>PEC:</strong> cabcert@pec.it
        </P>
        <P>
          <strong>Telefono:</strong> +39 0809904176
        </P>
      </>
    ),
  },
  {
    id: "privacy-dpo",
    title: "2. Responsabile della Protezione dei Dati (DPO)",
    body: (
      <>
        <P>
          Il Titolare non ha nominato un Responsabile della Protezione dei Dati (DPO), in quanto non ricorrono i
          presupposti previsti dall&apos;art. 37 del GDPR.
        </P>
        <P>Qualora venga nominato, i relativi recapiti saranno pubblicati in questa sezione.</P>
      </>
    ),
  },
  {
    id: "privacy-finalita",
    title: "3. Finalità del trattamento",
    body: (
      <>
        <P>I dati personali sono trattati esclusivamente per le seguenti finalità:</P>
        <Ul>
          <li>creare e gestire gli account degli utenti autorizzati;</li>
          <li>consentire l&apos;autenticazione e l&apos;accesso all&apos;area riservata;</li>
          <li>identificare l&apos;utente autorizzato;</li>
          <li>consentire la consultazione delle informazioni relative ai propri veicoli;</li>
          <li>mostrare lo stato delle lavorazioni e degli interventi effettuati presso l&apos;officina;</li>
          <li>garantire la sicurezza dell&apos;applicazione e prevenire accessi non autorizzati;</li>
          <li>adempiere agli obblighi di legge;</li>
          <li>tutelare i diritti del Titolare in caso di contenzioso.</li>
        </Ul>
        <P>Il sito ha esclusivamente funzione informativa e di consultazione.</P>
        <P>Gli utenti non possono inserire, modificare o cancellare dati personali mediante il sito.</P>
      </>
    ),
  },
  {
    id: "privacy-tipologia",
    title: "4. Tipologia dei dati trattati",
    body: (
      <>
        <P>
          Possono essere trattati esclusivamente i dati strettamente necessari all&apos;erogazione del servizio, tra cui:
        </P>
        <h3 className={subTitleClass}>Dati identificativi</h3>
        <Ul>
          <li>nome e cognome;</li>
          <li>indirizzo email;</li>
          <li>nome utente.</li>
        </Ul>
        <h3 className={`${subTitleClass} mt-4`}>Credenziali di autenticazione</h3>
        <P>
          La password non è conservata in chiaro ma esclusivamente in forma crittografata (hash) mediante il sistema di
          autenticazione utilizzato.
        </P>
        <h3 className={`${subTitleClass} mt-4`}>Dati relativi ai veicoli</h3>
        <P>Possono essere visualizzate informazioni quali:</P>
        <Ul>
          <li>targa;</li>
          <li>marca;</li>
          <li>modello;</li>
          <li>numero interno;</li>
          <li>stato della lavorazione;</li>
          <li>interventi effettuati;</li>
          <li>documentazione tecnica;</li>
          <li>fotografie del mezzo eventualmente caricate dall&apos;officina;</li>
          <li>ulteriori informazioni tecniche relative all&apos;intervento.</li>
        </Ul>
        <h3 className={`${subTitleClass} mt-4`}>Dati tecnici</h3>
        <P>
          Per motivi di sicurezza possono essere trattati dati tecnici relativi agli accessi, agli eventi di
          autenticazione e ai log applicativi.
        </P>
      </>
    ),
  },
  {
    id: "privacy-origine",
    title: "5. Origine dei dati",
    body: (
      <>
        <P>I dati personali non vengono raccolti tramite registrazione online.</P>
        <P>
          Essi sono acquisiti direttamente dal cliente nell&apos;ambito del rapporto commerciale oppure inseriti dal
          personale autorizzato del Titolare al momento della creazione dell&apos;account.
        </P>
      </>
    ),
  },
  {
    id: "privacy-base-giuridica",
    title: "6. Base giuridica del trattamento",
    body: (
      <>
        <P>Il trattamento dei dati trova fondamento nelle seguenti basi giuridiche:</P>
        <Ul>
          <li>art. 6, par. 1, lett. b) GDPR – esecuzione del contratto o di misure precontrattuali;</li>
          <li>art. 6, par. 1, lett. c) GDPR – adempimento di obblighi di legge;</li>
          <li>
            art. 6, par. 1, lett. f) GDPR – perseguimento del legittimo interesse del Titolare consistente nella gestione
            del servizio, nella sicurezza della piattaforma e nella tutela dei propri diritti.
          </li>
        </Ul>
        <P>Per il funzionamento del sito non viene richiesto il consenso dell&apos;interessato.</P>
      </>
    ),
  },
  {
    id: "privacy-modalita",
    title: "7. Modalità del trattamento",
    body: (
      <>
        <P>
          Il trattamento è effettuato con strumenti elettronici e telematici nel rispetto dei principi di:
        </P>
        <Ul>
          <li>liceità;</li>
          <li>correttezza;</li>
          <li>trasparenza;</li>
          <li>minimizzazione dei dati;</li>
          <li>limitazione delle finalità;</li>
          <li>esattezza;</li>
          <li>limitazione della conservazione;</li>
          <li>integrità e riservatezza.</li>
        </Ul>
        <P>
          Il Titolare adotta misure tecniche e organizzative adeguate a garantire un livello di sicurezza proporzionato ai
          rischi del trattamento.
        </P>
      </>
    ),
  },
  {
    id: "privacy-conservazione",
    title: "8. Conservazione dei dati",
    body: (
      <>
        <P>I dati personali sono conservati:</P>
        <Ul>
          <li>per tutta la durata del rapporto contrattuale;</li>
          <li>per il tempo necessario all&apos;erogazione del servizio;</li>
          <li>successivamente, per il periodo previsto dalla normativa civile, fiscale e contabile applicabile;</li>
          <li>per il tempo necessario alla tutela dei diritti del Titolare in sede giudiziaria.</li>
        </Ul>
        <P>Decorso tale termine, i dati saranno cancellati o anonimizzati, salvo diversi obblighi di legge.</P>
      </>
    ),
  },
  {
    id: "privacy-destinatari",
    title: "9. Destinatari dei dati",
    body: (
      <>
        <P>I dati possono essere trattati esclusivamente da:</P>
        <Ul>
          <li>personale autorizzato dal Titolare;</li>
          <li>consulenti e professionisti vincolati alla riservatezza;</li>
          <li>fornitori di servizi informatici nominati Responsabili del trattamento ai sensi dell&apos;art. 28 del GDPR;</li>
          <li>autorità pubbliche quando previsto dalla legge.</li>
        </Ul>
        <P>I dati personali non sono oggetto di diffusione.</P>
      </>
    ),
  },
  {
    id: "privacy-fornitori",
    title: "10. Fornitori dei servizi informatici",
    body: (
      <>
        <P>Per l&apos;erogazione del servizio il Titolare utilizza i seguenti fornitori:</P>
        <Ul>
          <li>
            <strong>Supabase</strong>, quale infrastruttura cloud per database, autenticazione e servizi correlati;
          </li>
          <li>
            <strong>Vercel</strong>, quale infrastruttura di hosting e distribuzione dell&apos;applicazione web.
          </li>
        </Ul>
        <P>
          Qualora operino quali Responsabili del trattamento, tali soggetti trattano i dati esclusivamente secondo le
          istruzioni del Titolare e nel rispetto dell&apos;art. 28 del GDPR.
        </P>
      </>
    ),
  },
  {
    id: "privacy-trasferimento",
    title: "11. Trasferimento dei dati verso Paesi terzi",
    body: (
      <>
        <P>
          L&apos;utilizzo di infrastrutture cloud può comportare il trattamento dei dati al di fuori dello Spazio
          Economico Europeo.
        </P>
        <P>
          Qualora ciò avvenga, il trasferimento sarà effettuato esclusivamente nel rispetto degli articoli 44 e seguenti
          del GDPR, mediante gli strumenti di garanzia previsti dalla normativa vigente, quali decisioni di adeguatezza
          della Commissione Europea o Clausole Contrattuali Standard (SCC).
        </P>
      </>
    ),
  },
  {
    id: "privacy-automatizzato",
    title: "12. Processo decisionale automatizzato",
    body: (
      <P>
        Il Titolare non effettua trattamenti basati esclusivamente su processi decisionali automatizzati né attività di
        profilazione ai sensi dell&apos;art. 22 del GDPR.
      </P>
    ),
  },
  {
    id: "privacy-cookie",
    title: "13. Cookie e tecnologie di autenticazione",
    body: (
      <>
        <P>
          Il sito utilizza esclusivamente cookie tecnici e tecnologie strettamente necessarie al funzionamento
          dell&apos;area riservata e del sistema di autenticazione.
        </P>
        <P>Tali strumenti sono impiegati esclusivamente per:</P>
        <Ul>
          <li>consentire l&apos;accesso sicuro all&apos;area riservata;</li>
          <li>mantenere la sessione autenticata dell&apos;utente;</li>
          <li>garantire la sicurezza dell&apos;applicazione;</li>
          <li>prevenire accessi non autorizzati.</li>
        </Ul>
        <P>Il sito <strong>non utilizza</strong>:</P>
        <Ul>
          <li>cookie di profilazione;</li>
          <li>cookie pubblicitari;</li>
          <li>cookie di marketing;</li>
          <li>cookie destinati alla creazione di profili degli utenti;</li>
          <li>strumenti di tracciamento per finalità commerciali;</li>
          <li>servizi di analytics installati dal Titolare.</li>
        </Ul>
        <P>
          Poiché vengono utilizzati esclusivamente cookie tecnici necessari al funzionamento del servizio, non è
          richiesto il consenso preventivo dell&apos;utente ai sensi della normativa vigente.
        </P>
      </>
    ),
  },
  {
    id: "privacy-diritti",
    title: "14. Diritti dell'interessato",
    body: (
      <>
        <P>
          L&apos;interessato può esercitare in qualsiasi momento i diritti previsti dagli articoli 15-22 del GDPR, tra
          cui:
        </P>
        <Ul>
          <li>ottenere conferma dell&apos;esistenza dei propri dati personali;</li>
          <li>accedere ai dati;</li>
          <li>richiederne la rettifica;</li>
          <li>richiederne la cancellazione nei casi previsti dalla legge;</li>
          <li>ottenere la limitazione del trattamento;</li>
          <li>opporsi al trattamento nei casi previsti dall&apos;art. 21 del GDPR;</li>
          <li>richiedere la portabilità dei dati, ove applicabile.</li>
        </Ul>
        <P>Le richieste possono essere inviate ai recapiti del Titolare indicati nella presente informativa.</P>
      </>
    ),
  },
  {
    id: "privacy-reclamo",
    title: "15. Reclamo all'Autorità di controllo",
    body: (
      <P>
        Qualora ritenga che il trattamento dei propri dati violi il GDPR, l&apos;interessato ha il diritto di proporre
        reclamo all&apos;Autorità Garante per la Protezione dei Dati Personali o di adire le competenti sedi
        giudiziarie.
      </P>
    ),
  },
  {
    id: "privacy-sicurezza-account",
    title: "16. Sicurezza dell'account",
    body: (
      <>
        <P>
          L&apos;utente è tenuto a custodire con la massima riservatezza le proprie credenziali di accesso.
        </P>
        <P>
          Qualsiasi utilizzo dell&apos;account effettuato mediante credenziali valide si presume effettuato
          dall&apos;utente titolare, salvo prova contraria.
        </P>
        <P>
          L&apos;utente è tenuto a comunicare tempestivamente al Titolare qualsiasi sospetto utilizzo non autorizzato del
          proprio account.
        </P>
      </>
    ),
  },
  {
    id: "privacy-modifiche",
    title: "17. Modifiche alla presente Privacy Policy",
    body: (
      <>
        <P>
          Il Titolare si riserva il diritto di aggiornare la presente Privacy Policy in qualsiasi momento, anche in
          conseguenza di modifiche normative, organizzative o tecnologiche.
        </P>
        <P>
          La versione aggiornata sarà pubblicata sul sito con indicazione della data dell&apos;ultimo aggiornamento.
        </P>
      </>
    ),
  },
];

export const privacyPolicyIntro = (
  <>
    <P>
      La presente Privacy Policy è resa ai sensi degli articoli 13 e 14 del Regolamento (UE) 2016/679
      (&quot;GDPR&quot;) e descrive le modalità con cui <strong>Centro Assistenza Bari SRL</strong>{" "}
      (di seguito &quot;Titolare&quot;) tratta i dati personali degli utenti che accedono all&apos;area riservata del
      presente sito web.
    </P>
    <P>
      L&apos;accesso al sito è riservato esclusivamente ai clienti dell&apos;officina ai quali il Titolare ha
      preventivamente creato un account.
    </P>
  </>
);
