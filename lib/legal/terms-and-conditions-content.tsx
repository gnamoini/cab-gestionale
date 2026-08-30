import type { ReactNode } from "react";
import Link from "next/link";
import { dsTypoBody } from "@/lib/ui/design-system";
import { PRIVACY_POLICY_PATH } from "@/lib/legal/privacy-policy-return";

export type TermsAndConditionsSection = {
  id: string;
  title: string;
  body: ReactNode;
};

const bodyClass = dsTypoBody;
const listClass = `${bodyClass} list-disc space-y-1 pl-5`;

function P({ children }: { children: ReactNode }) {
  return <p className={bodyClass}>{children}</p>;
}

function Ul({ children }: { children: ReactNode }) {
  return <ul className={listClass}>{children}</ul>;
}

export const TERMS_AND_CONDITIONS_LAST_UPDATED = "22 agosto 2026";

export const termsAndConditionsSections: TermsAndConditionsSection[] = [
  {
    id: "termini-premessa",
    title: "1. Premessa e accettazione",
    body: (
      <>
        <P>
          I presenti Termini e Condizioni (&quot;Termini&quot;) disciplinano l&apos;accesso e l&apos;utilizzo della
          piattaforma web <strong>CAB Gestionale Officina</strong> (di seguito &quot;Servizio&quot; o
          &quot;Applicazione&quot;), messa a disposizione da <strong>Centro Assistenza Bari SRL</strong> (di seguito
          &quot;Fornitore&quot;).
        </P>
        <P>
          L&apos;accesso all&apos;area riservata, la creazione dell&apos;account e l&apos;utilizzo del Servizio
          comportano l&apos;accettazione integrale dei presenti Termini. Chi non intenda accettarli è invitato a non
          utilizzare il Servizio.
        </P>
      </>
    ),
  },
  {
    id: "termini-fornitore",
    title: "2. Titolare del servizio",
    body: (
      <>
        <P>
          <strong>Denominazione:</strong> Centro Assistenza Bari SRL
        </P>
        <P>
          <strong>Sede legale:</strong> Via dei Lilium, 70026 Modugno
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
        <P>
          <strong>Sito web:</strong> www.autocompattatori.it
        </P>
      </>
    ),
  },
  {
    id: "termini-definizioni",
    title: "3. Definizioni",
    body: (
      <>
        <P>Ai fini dei presenti Termini si intende per:</P>
        <Ul>
          <li>
            <strong>Utente:</strong> persona fisica autorizzata ad accedere al Servizio tramite credenziali rilasciate
            dal Fornitore;
          </li>
          <li>
            <strong>Cliente:</strong> soggetto che intrattiene un rapporto commerciale con il Fornitore e al quale
            possono essere associate informazioni su veicoli e lavorazioni;
          </li>
          <li>
            <strong>Personale autorizzato:</strong> dipendenti, collaboratori o operatori del Fornitore con profilo di
            accesso dedicato;
          </li>
          <li>
            <strong>Area riservata:</strong> sezione dell&apos;Applicazione accessibile previa autenticazione;
          </li>
          <li>
            <strong>Contenuti:</strong> dati, documenti, testi, immagini, report, notifiche e ogni altra informazione
            presente o generata tramite il Servizio.
          </li>
        </Ul>
      </>
    ),
  },
  {
    id: "termini-oggetto",
    title: "4. Oggetto del servizio",
    body: (
      <>
        <P>
          Il Servizio è una piattaforma gestionale utilizzata dal Fornitore per la gestione operativa dell&apos;officina
          e, ove previsto, per la consultazione da parte dei Clienti delle informazioni relative ai propri veicoli e alle
          lavorazioni in corso o concluse.
        </P>
        <P>Tra le funzionalità del Servizio possono rientrare, a seconda del profilo assegnato:</P>
        <Ul>
          <li>gestione di clienti, mezzi, dipendenti e interventi;</li>
          <li>consultazione dello stato delle lavorazioni;</li>
          <li>visualizzazione di preventivi, documenti tecnici e reportistica;</li>
          <li>ricezione di notifiche relative al Servizio;</li>
          <li>accesso a funzionalità di configurazione, sicurezza e documentazione PDF.</li>
        </Ul>
        <P>
          Le funzionalità effettivamente disponibili dipendono dal ruolo assegnato all&apos;Utente e dalle impostazioni
          operative del Fornitore.
        </P>
      </>
    ),
  },
  {
    id: "termini-accesso",
    title: "5. Accesso e account utente",
    body: (
      <>
        <P>
          L&apos;accesso al Servizio è riservato esclusivamente agli Utenti autorizzati. Non è prevista registrazione
          autonoma online: gli account sono creati dal Fornitore o dal personale da esso delegato.
        </P>
        <P>
          Le credenziali di accesso sono personali e non cedibili. L&apos;Utente è responsabile della loro custodia e
          dell&apos;uso che ne viene fatto tramite il proprio account.
        </P>
        <P>
          Il Fornitore può sospendere o revocare l&apos;accesso in caso di violazione dei presenti Termini, uso
          improprio del Servizio, cessazione del rapporto commerciale o esigenze di sicurezza.
        </P>
      </>
    ),
  },
  {
    id: "termini-utilizzo",
    title: "6. Modalità di utilizzo",
    body: (
      <>
        <P>L&apos;Utente si impegna a utilizzare il Servizio:</P>
        <Ul>
          <li>nel rispetto della legge vigente e dei presenti Termini;</li>
          <li>esclusivamente per finalità connesse al rapporto con il Fornitore;</li>
          <li>con diligenza e correttezza;</li>
          <li>senza compromettere la sicurezza, l&apos;integrità o la disponibilità della piattaforma.</li>
        </Ul>
        <P>
          Per gli Utenti con profilo Cliente, il Servizio ha prevalentemente finalità consultative. Salvo diversa
          autorizzazione espressa, tali Utenti non possono inserire, modificare o cancellare dati operativi
          dell&apos;officina.
        </P>
      </>
    ),
  },
  {
    id: "termini-obblighi",
    title: "7. Obblighi dell'utente",
    body: (
      <>
        <P>L&apos;Utente si impegna a:</P>
        <Ul>
          <li>fornire dati veritieri ove richiesti per l&apos;utilizzo del Servizio;</li>
          <li>non condividere le proprie credenziali con terzi;</li>
          <li>segnalare tempestivamente al Fornitore accessi non autorizzati o sospetti;</li>
          <li>non tentare di aggirare sistemi di autenticazione, permessi o controlli di sicurezza;</li>
          <li>non utilizzare strumenti automatici per estrarre dati o sovraccaricare l&apos;infrastruttura;</li>
          <li>non copiare, diffondere o riutilizzare Contenuti oltre quanto consentito dal proprio profilo.</li>
        </Ul>
      </>
    ),
  },
  {
    id: "termini-vietato",
    title: "8. Utilizzi vietati",
    body: (
      <>
        <P>È espressamente vietato:</P>
        <Ul>
          <li>accedere a sezioni, dati o funzioni non autorizzate dal proprio profilo;</li>
          <li>alterare, cancellare o inserire dati senza titolo;</li>
          <li>diffondere malware, codice dannoso o contenuti illeciti;</li>
          <li>compiere attività che possano arrecare pregiudizio al Fornitore, ad altri Utenti o a terzi;</li>
          <li>utilizzare il Servizio per finalità concorrenziali, di reverse engineering o di analisi non autorizzata.</li>
        </Ul>
      </>
    ),
  },
  {
    id: "termini-contenuti",
    title: "9. Contenuti e proprietà intellettuale",
    body: (
      <>
        <P>
          L&apos;Applicazione, la sua struttura, l&apos;interfaccia, il software, i marchi, i loghi e ogni altro
          elemento del Servizio restano di proprietà del Fornitore o dei rispettivi titolari e sono protetti dalle norme
          applicabili in materia di proprietà intellettuale.
        </P>
        <P>
          I dati inseriti o visualizzati nell&apos;ambito del rapporto commerciale restano di competenza dei soggetti
          legittimamente titolari secondo la normativa vigente e le regole operative del Fornitore.
        </P>
        <P>
          Salvo diversa autorizzazione scritta, all&apos;Utente è concesso solo un diritto di utilizzo limitato,
          personale, non esclusivo e non trasferibile del Servizio per la durata dell&apos;account.
        </P>
      </>
    ),
  },
  {
    id: "termini-disponibilita",
    title: "10. Disponibilità e manutenzione",
    body: (
      <>
        <P>
          Il Fornitore si impegna a rendere il Servizio disponibile con diligenza professionale, compatibilmente con
          esigenze di manutenzione, aggiornamento, sicurezza e continuità operativa.
        </P>
        <P>
          Possono verificarsi interruzioni, rallentamenti o limitazioni temporanee dovute a manutenzione programmata,
          malfunzionamenti tecnici, aggiornamenti dell&apos;infrastruttura o cause non imputabili al Fornitore.
        </P>
        <P>
          Il Fornitore può modificare, aggiornare o dismettere funzionalità del Servizio, purché ciò non comporti una
          violazione di obblighi contrattuali specifici eventualmente assunti nei confronti del Cliente.
        </P>
      </>
    ),
  },
  {
    id: "termini-responsabilita",
    title: "11. Limitazione di responsabilità",
    body: (
      <>
        <P>
          Il Servizio è fornito per supportare le attività operative del Fornitore e la consultazione autorizzata dei
          Clienti. Salvo diversa previsione inderogabile di legge, il Fornitore non risponde di:
        </P>
        <Ul>
          <li>interruzioni o malfunzionamenti dovuti a cause di forza maggiore o a terzi fornitori;</li>
          <li>utilizzo improprio del Servizio da parte dell&apos;Utente;</li>
          <li>decisioni assunte dall&apos;Utente sulla base delle informazioni visualizzate;</li>
          <li>danni indiretti, perdita di profitto o perdita di dati derivanti da uso non conforme ai presenti Termini.</li>
        </Ul>
        <P>
          Resta salva la responsabilità del Fornitore per dolo o colpa grave e per ogni altra ipotesi non derogabile
          secondo la legge applicabile.
        </P>
      </>
    ),
  },
  {
    id: "termini-privacy",
    title: "12. Protezione dei dati personali",
    body: (
      <>
        <P>
          Il trattamento dei dati personali effettuato tramite il Servizio è disciplinato dalla{" "}
          <Link href={PRIVACY_POLICY_PATH} className="underline underline-offset-2 hover:text-[color:var(--cab-text)]">
            Privacy Policy
          </Link>
          , che costituisce parte integrante della documentazione contrattuale relativa all&apos;utilizzo
          dell&apos;Applicazione.
        </P>
        <P>
          L&apos;Utente è invitato a consultare tale informativa per conoscere finalità, basi giuridiche, diritti e
          modalità di esercizio degli stessi.
        </P>
      </>
    ),
  },
  {
    id: "termini-sicurezza",
    title: "13. Sicurezza informatica",
    body: (
      <>
        <P>
          Il Fornitore adotta misure tecniche e organizzative adeguate per proteggere il Servizio e i dati trattati,
          incluse misure di autenticazione, controllo degli accessi e monitoraggio degli eventi rilevanti.
        </P>
        <P>
          L&apos;Utente contribuisce alla sicurezza del Servizio utilizzando credenziali robuste, aggiornando la
          password quando richiesto e non lasciando sessioni attive su dispositivi non affidabili.
        </P>
      </>
    ),
  },
  {
    id: "termini-pwa",
    title: "14. Applicazione web e notifiche",
    body: (
      <>
        <P>
          Il Servizio può essere reso disponibile anche come applicazione web progressiva (PWA) e può prevedere
          l&apos;invio di notifiche relative a eventi operativi o di sistema.
        </P>
        <P>
          L&apos;attivazione di tali funzionalità è facoltativa e può richiedere il consenso del browser o del
          dispositivo. L&apos;Utente può disattivarle in qualsiasi momento dalle impostazioni del proprio dispositivo o
          dell&apos;Applicazione, ove previsto.
        </P>
      </>
    ),
  },
  {
    id: "termini-modifiche",
    title: "15. Modifiche ai Termini",
    body: (
      <>
        <P>
          Il Fornitore può aggiornare i presenti Termini per adeguamenti normativi, organizzativi, tecnologici o
          funzionali del Servizio.
        </P>
        <P>
          La versione aggiornata sarà pubblicata sull&apos;Applicazione con indicazione della data dell&apos;ultimo
          aggiornamento. L&apos;uso continuato del Servizio dopo la pubblicazione delle modifiche vale come accettazione
          dei Termini aggiornati.
        </P>
      </>
    ),
  },
  {
    id: "termini-durata",
    title: "16. Durata, sospensione e cessazione",
    body: (
      <>
        <P>
          I presenti Termini restano efficaci per tutta la durata dell&apos;account e dell&apos;utilizzo del Servizio.
        </P>
        <P>
          Il Fornitore può sospendere o cessare l&apos;accesso in caso di violazione dei Termini, esigenze di sicurezza,
          cessazione del rapporto commerciale o su richiesta dell&apos;Utente, ove applicabile.
        </P>
        <P>
          Le clausole che per loro natura devono sopravvivere alla cessazione — incluse quelle su proprietà
          intellettuale, limitazione di responsabilità e legge applicabile — continueranno ad applicarsi.
        </P>
      </>
    ),
  },
  {
    id: "termini-legge",
    title: "17. Legge applicabile e foro competente",
    body: (
      <>
        <P>
          I presenti Termini sono regolati dalla legge italiana, fatti salvi i diritti inderogabili riconosciuti
          all&apos;Utente consumatore dalla normativa vigente.
        </P>
        <P>
          Per ogni controversia relativa all&apos;interpretazione, esecuzione o validità dei presenti Termini sarà
          competente in via esclusiva il Foro di Bari, salvo diversa competenza inderogabile prevista dalla legge.
        </P>
      </>
    ),
  },
  {
    id: "termini-contatti",
    title: "18. Contatti",
    body: (
      <>
        <P>
          Per richieste relative ai presenti Termini o all&apos;utilizzo del Servizio è possibile contattare il
          Fornitore ai recapiti indicati nella sezione 2.
        </P>
        <P>
          Per questioni relative al trattamento dei dati personali, fare riferimento alla Privacy Policy e ai recapiti
          ivi indicati.
        </P>
      </>
    ),
  },
];

export const termsAndConditionsIntro = (
  <>
    <P>
      I presenti Termini e Condizioni regolano l&apos;accesso e l&apos;utilizzo dell&apos;area riservata di{" "}
      <strong>CAB Gestionale Officina</strong>, piattaforma gestionale di <strong>Centro Assistenza Bari SRL</strong>.
    </P>
    <P>
      Il Servizio è destinato esclusivamente a Clienti e personale autorizzato dell&apos;officina ai quali il Fornitore
      abbia rilasciato credenziali di accesso.
    </P>
  </>
);
