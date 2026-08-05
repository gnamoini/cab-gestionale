import type { CommunicationTemplateKey } from "@/lib/communications/domain/communication-template-keys";

export type DefaultTemplate = {
  subject: string;
  body: string;
};

export const DEFAULT_COMMUNICATION_TEMPLATES: Record<CommunicationTemplateKey, DefaultTemplate> = {
  "work_order.created": {
    subject: "Abbiamo preso in carico il suo mezzo",
    body: `Gentile {{cliente}},

abbiamo preso in carico il vostro mezzo.

Mezzo: {{mezzo}}
Targa: {{targa}}
Data ingresso: {{data}}
Numero lavorazione: {{numero_lavorazione}}

Cordiali saluti,
{{azienda}}
{{indirizzo}}
Tel. {{telefono_officina}} — {{email_officina}}`,
  },
  "work_order.completed": {
    subject: "Il suo mezzo è pronto",
    body: `Gentile {{cliente}},

il vostro mezzo è pronto per il ritiro.

Mezzo: {{mezzo}}
Targa: {{targa}}
Numero lavorazione: {{numero_lavorazione}}

Cordiali saluti,
{{azienda}}`,
  },
  "estimate.published": {
    subject: "Nuovo preventivo disponibile per la tua lavorazione",
    body: `Gentile {{cliente}},

è disponibile il preventivo {{numero_preventivo}} (v{{versione}}) per la lavorazione {{numero_lavorazione}}.

Mezzo: {{mezzo}} ({{targa}})
Totale: {{totale}}

{{descrizione_preventivo}}

Il preventivo è disponibile per accettazione entro 24 ore dal portale:
{{link_lavorazione}}

Cordiali saluti,
{{azienda}}`,
  },
  "estimate.approved": {
    subject: "Conferma preventivo",
    body: `Gentile {{cliente}},

confermiamo l'approvazione del preventivo {{numero_preventivo}}.

Cordiali saluti,
{{azienda}}`,
  },
  "estimate.reminder": {
    subject: "Promemoria: preventivo in attesa di conferma",
    body: `Gentile {{cliente}},

ti ricordiamo che hai un preventivo {{numero_preventivo}} in attesa di conferma.

Totale: {{totale}}
{{link_lavorazione}}

Cordiali saluti,
{{azienda}}`,
  },
  "estimate.accepted": {
    subject: "Conferma ricezione preventivo",
    body: `Gentile {{cliente}},

abbiamo ricevuto la conferma del preventivo {{numero_preventivo}}.

Cordiali saluti,
{{azienda}}`,
  },
  "estimate.rejected": {
    subject: "Ricezione rifiuto preventivo",
    body: `Gentile {{cliente}},

abbiamo registrato il rifiuto del preventivo {{numero_preventivo}}.

Cordiali saluti,
{{azienda}}`,
  },
  "invoice.issued": {
    subject: "Fattura emessa",
    body: `Gentile {{cliente}},

è stata emessa una fattura. Totale: {{totale}}

Cordiali saluti,
{{azienda}}`,
  },
  "supplier_order.sent": {
    subject: "Ordine {{ordine}}",
    body: `Spett.le {{fornitore}},

in allegato l'ordine {{ordine}}.

Cordiali saluti,
{{azienda}}
{{telefono_officina}}`,
  },
  "maintenance.reminder": {
    subject: "Promemoria tagliando",
    body: `Gentile {{cliente}},

promemoria tagliando per il mezzo {{mezzo}} ({{targa}}).
Data prevista: {{data}}

Cordiali saluti,
{{azienda}}`,
  },
};
