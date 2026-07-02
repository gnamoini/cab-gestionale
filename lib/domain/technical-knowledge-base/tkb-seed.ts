import type { TkbDraftBundle } from "./types";

/** Seed iniziale Freni / Sospensioni / Elettrico per dev e test. */
export function createTkbSeedDraft(): TkbDraftBundle {
  return {
    categorie: [
      { slug: "freni", label: "Freni", sortOrder: 1 },
      { slug: "sospensioni", label: "Sospensioni", sortOrder: 2 },
      { slug: "impianto_elettrico", label: "Impianto elettrico", sortOrder: 3 },
    ],
    componenti: [
      { slug: "pinza_freno", label: "Pinza freno", categoriaSlug: "freni", synonyms: ["pinza", "caliper"] },
      { slug: "pastiglie_freno", label: "Pastiglie freno", categoriaSlug: "freni", synonyms: ["pastiglie"] },
      { slug: "circuito_frenante", label: "Circuito frenante", categoriaSlug: "freni" },
      { slug: "gruppo_frenante", label: "Gruppo frenante", categoriaSlug: "freni" },
      { slug: "amortizzatore", label: "Amortizzatore", categoriaSlug: "sospensioni" },
      { slug: "impianto_elettrico", label: "Impianto elettrico", categoriaSlug: "impianto_elettrico" },
    ],
    sintomi: [
      {
        slug: "perdita_liquido_freni",
        label: "Perdita liquido freni",
        keywords: ["perdita", "liquido", "freni", "perdite"],
        relatedComponentiSlugs: ["circuito_frenante"],
      },
      {
        slug: "spia_freni",
        label: "Spia freni accesa",
        keywords: ["spia", "freni", "warning"],
        relatedComponentiSlugs: ["circuito_frenante"],
      },
    ],
    procedure: [
      {
        slug: "freni_sostituzione_base",
        label: "Base sostituzione impianto frenante",
        categoriaSlug: "freni",
        attivita: [
          {
            activityId: "freni_smontaggio_gruppo",
            text: "Smontaggio gruppo frenante interessato",
            sort: 10,
            required: true,
            activityType: "smontaggio",
            componenteSlugs: ["gruppo_frenante"],
          },
          {
            activityId: "freni_pulizia_componenti",
            text: "Pulizia componenti e ripristino collegamenti",
            sort: 35,
            required: false,
            includeInStandard: true,
            activityType: "pulizia",
          },
          {
            activityId: "freni_spurgo_circuito",
            text: "Spurgo circuito frenante",
            sort: 38,
            required: false,
            includeInStandard: true,
            activityType: "ripristino",
            componenteSlugs: ["circuito_frenante"],
          },
        ],
        controlliFinali: [
          {
            activityId: "freni_controllo_finale",
            text: "Controllo finale impianto frenante",
            sort: 50,
            required: true,
            activityType: "controllo",
            componenteSlugs: ["circuito_frenante"],
          },
        ],
      },
    ],
    interventi: [
      {
        slug: "sostituzione_pinza_freno",
        label: "Sostituzione pinza freno",
        categoriaSlug: "freni",
        keywords: ["sostituzione pinza freno", "pinza freno", "cambio pinza"],
        componentiSlugs: ["pinza_freno", "gruppo_frenante"],
        sintomiSlugs: ["perdita_liquido_freni"],
        procedureSlugs: ["freni_sostituzione_base"],
        attivitaPrincipali: [
          {
            activityId: "freni_sostituzione_pinza",
            text: "Sostituzione pinza freno anteriore",
            sort: 30,
            required: true,
            activityType: "sostituzione",
            componenteSlugs: ["pinza_freno"],
          },
        ],
      },
      {
        slug: "sostituzione_pastiglie_freno",
        label: "Sostituzione pastiglie freno",
        categoriaSlug: "freni",
        keywords: ["pastiglie freno", "sostituzione pastiglie"],
        componentiSlugs: ["pastiglie_freno"],
        procedureSlugs: ["freni_sostituzione_base"],
        activityOverrides: [
          { activityId: "freni_spurgo_circuito", action: "disable", reason: "Non richiesto per pastiglie" },
          { activityId: "freni_pulizia_componenti", action: "disable", reason: "Non richiesto per pastiglie" },
        ],
        attivitaPrincipali: [
          {
            activityId: "freni_sostituzione_pastiglie",
            text: "Sostituzione pastiglie freno",
            sort: 30,
            required: true,
            activityType: "sostituzione",
            componenteSlugs: ["pastiglie_freno"],
          },
        ],
      },
      {
        slug: "diagnosi_impianto_elettrico",
        label: "Diagnosi impianto elettrico",
        categoriaSlug: "impianto_elettrico",
        keywords: ["diagnosi elettrico", "impianto elettrico", "guasto elettrico"],
        componentiSlugs: ["impianto_elettrico"],
        attivitaPrincipali: [
          {
            activityId: "elett_diagnosi",
            text: "Diagnosi impianto elettrico",
            sort: 5,
            required: true,
            activityType: "diagnosi",
          },
          {
            activityId: "elett_verifica_funzionamento",
            text: "Verifica funzionamento impianto elettrico",
            sort: 45,
            required: true,
            activityType: "controllo",
          },
        ],
      },
    ],
    ricambiMap: [],
  };
}
