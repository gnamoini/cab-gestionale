import type { GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";
import { formatTitleCasePhrase } from "@/lib/gestionale-log/view-model";
import type { TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";
import { addettoDisplayName, type AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import type { PrioritaLav, StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import type { AttrezzaturaMarca } from "@/lib/mezzi/attrezzature-prefs";
import type { MagazzinoMasterPrefs } from "@/lib/magazzino/magazzino-master-prefs-storage";
import type { PrioritaLavorazione } from "@/src/types/supabase-tables";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import type { SistemaPreventiviDefaults } from "@/lib/sistema/sistema-preventivi-defaults-storage";
import type { CabBrandingSettings } from "@/lib/branding/branding-settings-model";

export type ConfigurazioneSettingsSnapshot = {
  stati: StatoLavorazioneConfig[];
  addettiRecords: AddettoRecord[];
  addettoColors: Record<string, string>;
  prioritaColors: Partial<Record<PrioritaLav, string>>;
  prioritaDb: PrioritaLavorazione[];
  mag: MagazzinoMasterPrefs;
  liste: MezziListePrefs;
  eco: SistemaPreventiviDefaults;
  tipiAssenza: TipoAssenzaConfig[];
  branding: CabBrandingSettings;
};

export type ConfigurazioneSectionId =
  | "op-addetti"
  | "op-dipendenti-assenze"
  | "op-stati"
  | "op-priorita"
  | "mag-marche"
  | "mag-fornitori"
  | "mag-categorie"
  | "cli-cliente"
  | "cli-cantiere"
  | "cli-utilizzatore"
  | "att-tipo"
  | "att-marca"
  | "att-modello"
  | "tel-tipo"
  | "tel-marca"
  | "tel-modello"
  | "sys-economici"
  | "brand-personalizzazione";

export const CONFIGURAZIONE_SECTION_LABELS: Record<ConfigurazioneSectionId, string> = {
  "op-addetti": "Addetti",
  "op-dipendenti-assenze": "Tipi assenza dipendenti",
  "op-stati": "Stati lavorazioni",
  "op-priorita": "Priorità",
  "mag-marche": "Marche ricambi",
  "mag-fornitori": "Fornitori alternativi",
  "mag-categorie": "Categorie",
  "cli-cliente": "Cliente",
  "cli-cantiere": "Cantiere",
  "cli-utilizzatore": "Utilizzatore",
  "att-tipo": "Tipo attrezzatura",
  "att-marca": "Marca attrezzatura",
  "att-modello": "Modello attrezzatura",
  "tel-tipo": "Tipo telaio",
  "tel-marca": "Marca telaio",
  "tel-modello": "Modello telaio",
  "sys-economici": "Parametri economici",
  "brand-personalizzazione": "Branding",
};

function sliceKey(value: unknown): string {
  return JSON.stringify(value);
}

type SectionSlice = {
  id: ConfigurazioneSectionId;
  pick: (s: ConfigurazioneSettingsSnapshot) => unknown;
};

const SECTION_SLICES: SectionSlice[] = [
  {
    id: "op-addetti",
    pick: (s) => ({ addettiRecords: s.addettiRecords, addettoColors: s.addettoColors }),
  },
  { id: "op-dipendenti-assenze", pick: (s) => s.tipiAssenza },
  { id: "op-stati", pick: (s) => s.stati },
  {
    id: "op-priorita",
    pick: (s) => ({ prioritaColors: s.prioritaColors, prioritaDb: s.prioritaDb }),
  },
  {
    id: "mag-marche",
    pick: (s) => ({
      marche: s.mag.marche,
      scontoFornitoreByMarca: s.mag.scontoFornitoreByMarca,
      mezziCompatibili: s.mag.mezziCompatibili,
    }),
  },
  { id: "mag-fornitori", pick: (s) => s.mag.fornitori },
  { id: "mag-categorie", pick: (s) => s.mag.categorie },
  {
    id: "cli-cliente",
    pick: (s) => ({ clienti: s.liste.clienti, scontoRicambiByCliente: s.liste.scontoRicambiByCliente }),
  },
  { id: "cli-cantiere", pick: (s) => s.liste.cantieri },
  { id: "cli-utilizzatore", pick: (s) => s.liste.utilizzatori },
  { id: "att-tipo", pick: (s) => s.liste.tipiAttrezzatura },
  { id: "att-marca", pick: (s) => s.liste.attrezzature },
  { id: "att-modello", pick: (s) => s.liste.attrezzature },
  { id: "tel-tipo", pick: (s) => s.liste.tipiTelaio },
  { id: "tel-marca", pick: (s) => s.liste.telai },
  { id: "tel-modello", pick: (s) => s.liste.telai },
  { id: "sys-economici", pick: (s) => s.eco },
];

const MAX_DETAIL_LINES = 14;

function normKey(value: string): string {
  return value.trim().toLowerCase();
}

function toBulletModificaRiga(lines: string[]): string {
  if (!lines.length) return "—";
  return lines.map((l) => `• ${l.replace(/^•\s*/, "").trim()}`).join("\n");
}

function diffStringList(before: readonly string[], after: readonly string[], entity: string): string[] {
  const b = new Set(before.map((x) => normKey(x)).filter(Boolean));
  const a = new Set(after.map((x) => normKey(x)).filter(Boolean));
  const lines: string[] = [];
  for (const item of after) {
    const t = item.trim();
    if (t && !b.has(normKey(t))) lines.push(`Aggiunto ${entity} «${t}»`);
  }
  for (const item of before) {
    const t = item.trim();
    if (t && !a.has(normKey(t))) lines.push(`Rimosso ${entity} «${t}»`);
  }
  return lines;
}

function diffNumberRecord(
  before: Record<string, number> | undefined,
  after: Record<string, number> | undefined,
  label: (key: string) => string,
  suffix = "",
): string[] {
  const b = before ?? {};
  const a = after ?? {};
  const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
  const lines: string[] = [];
  for (const key of keys) {
    const bv = b[key];
    const av = a[key];
    if (bv === av) continue;
    if (bv === undefined && av !== undefined) {
      lines.push(`${label(key)}: impostato a ${av}${suffix}`);
    } else if (bv !== undefined && av === undefined) {
      lines.push(`${label(key)}: rimosso (era ${bv}${suffix})`);
    } else if (bv !== undefined && av !== undefined) {
      lines.push(`${label(key)}: da ${bv}${suffix} a ${av}${suffix}`);
    }
  }
  return lines;
}

function describeAddettiChanges(before: ConfigurazioneSettingsSnapshot, after: ConfigurazioneSettingsSnapshot): string[] {
  const lines: string[] = [];
  const bMap = new Map(before.addettiRecords.map((r) => [r.id, r]));
  const aMap = new Map(after.addettiRecords.map((r) => [r.id, r]));

  for (const [id, a] of aMap) {
    const b = bMap.get(id);
    if (!b) {
      lines.push(`Aggiunto addetto «${addettoDisplayName(a)}»`);
      continue;
    }
    if (addettoDisplayName(b) !== addettoDisplayName(a)) {
      lines.push(`Addetto rinominato da «${addettoDisplayName(b)}» a «${addettoDisplayName(a)}»`);
    }
  }
  for (const [id, b] of bMap) {
    if (!aMap.has(id)) lines.push(`Rimosso addetto «${addettoDisplayName(b)}»`);
  }

  const colorKeys = new Set([...Object.keys(before.addettoColors), ...Object.keys(after.addettoColors)]);
  for (const key of colorKeys) {
    const bv = before.addettoColors[key];
    const av = after.addettoColors[key];
    if (bv === av) continue;
    const who = aMap.get(key) ?? bMap.get(key);
    const label = who ? addettoDisplayName(who) : key;
    if (bv && av) lines.push(`Colore addetto «${label}»: da ${bv} a ${av}`);
    else if (av) lines.push(`Colore addetto «${label}»: impostato a ${av}`);
    else if (bv) lines.push(`Colore addetto «${label}»: rimosso`);
  }
  return lines;
}

function describeStatiChanges(before: StatoLavorazioneConfig[], after: StatoLavorazioneConfig[]): string[] {
  const lines: string[] = [];
  const bMap = new Map(before.map((s) => [s.id, s]));
  const aMap = new Map(after.map((s) => [s.id, s]));

  for (const [id, a] of aMap) {
    const b = bMap.get(id);
    if (!b) {
      lines.push(`Aggiunto stato «${a.label.trim() || id}»`);
      continue;
    }
    if (b.label.trim() !== a.label.trim()) {
      lines.push(`Stato rinominato da «${b.label.trim()}» a «${a.label.trim()}»`);
    }
    if ((b.color ?? "") !== (a.color ?? "")) {
      lines.push(`Colore stato «${a.label.trim()}»: aggiornato`);
    }
    if (Boolean(b.closed) !== Boolean(a.closed)) {
      lines.push(
        `Stato «${a.label.trim()}»: ${a.closed ? "marcato come finale" : "non più finale"}`,
      );
    }
  }
  for (const [id, b] of bMap) {
    if (!aMap.has(id)) lines.push(`Rimosso stato «${b.label.trim() || id}»`);
  }
  return lines;
}

function describePrioritaChanges(before: ConfigurazioneSettingsSnapshot, after: ConfigurazioneSettingsSnapshot): string[] {
  const lines: string[] = [];
  if (sliceKey(before.prioritaDb) !== sliceKey(after.prioritaDb)) {
    lines.push(`Ordine priorità aggiornato (${after.prioritaDb.join(", ")})`);
  }
  const keys = new Set([
    ...Object.keys(before.prioritaColors),
    ...Object.keys(after.prioritaColors),
  ]) as Set<PrioritaLav>;
  for (const key of keys) {
    const bv = before.prioritaColors[key];
    const av = after.prioritaColors[key];
    if (bv === av) continue;
    const label = formatTitleCasePhrase(key);
    if (bv && av) lines.push(`Colore priorità «${label}»: da ${bv} a ${av}`);
    else if (av) lines.push(`Colore priorità «${label}»: impostato a ${av}`);
    else if (bv) lines.push(`Colore priorità «${label}»: rimosso`);
  }
  return lines;
}

function describeTipiAssenzaChanges(before: TipoAssenzaConfig[], after: TipoAssenzaConfig[]): string[] {
  const lines: string[] = [];
  const bMap = new Map(before.map((t) => [t.id, t]));
  const aMap = new Map(after.map((t) => [t.id, t]));

  for (const [id, a] of aMap) {
    const b = bMap.get(id);
    if (!b) {
      lines.push(`Aggiunto tipo assenza «${a.label.trim()}» (${a.abbrev.trim()})`);
      continue;
    }
    if (b.label.trim() !== a.label.trim() || b.abbrev.trim() !== a.abbrev.trim()) {
      lines.push(`Tipo assenza aggiornato: «${b.label.trim()}» → «${a.label.trim()}» (${a.abbrev.trim()})`);
    }
    if (Boolean(b.requiresCustomText) !== Boolean(a.requiresCustomText)) {
      lines.push(`Tipo assenza «${a.label.trim()}»: testo libero ${a.requiresCustomText ? "attivato" : "disattivato"}`);
    }
  }
  for (const [id, b] of bMap) {
    if (!aMap.has(id)) lines.push(`Rimosso tipo assenza «${b.label.trim()}»`);
  }
  return lines;
}

function describeHierarchyChanges(
  before: AttrezzaturaMarca[] | undefined,
  after: AttrezzaturaMarca[] | undefined,
  kind: "attrezzatura" | "telaio",
): string[] {
  const lines: string[] = [];
  const bMarche = before ?? [];
  const aMarche = after ?? [];
  const bByName = new Map(bMarche.map((m) => [normKey(m.nome), m]));
  const aByName = new Map(aMarche.map((m) => [normKey(m.nome), m]));
  const kindLabel = kind === "attrezzatura" ? "attrezzatura" : "telaio";

  for (const [, a] of aByName) {
    const b = bByName.get(normKey(a.nome));
    if (!b) {
      lines.push(`Aggiunta marca ${kindLabel} «${a.nome.trim()}»`);
      continue;
    }
    lines.push(
      ...diffStringList(
        b.modelli.map((m) => m.nome),
        a.modelli.map((m) => m.nome),
        `modello ${kindLabel} «${a.nome.trim()}»`,
      ),
    );
  }
  for (const [, b] of bByName) {
    if (!aByName.has(normKey(b.nome))) lines.push(`Rimossa marca ${kindLabel} «${b.nome.trim()}»`);
  }
  return lines;
}

function describeSectionChanges(
  id: ConfigurazioneSectionId,
  before: ConfigurazioneSettingsSnapshot,
  after: ConfigurazioneSettingsSnapshot,
): string[] {
  switch (id) {
    case "op-addetti":
      return describeAddettiChanges(before, after);
    case "op-dipendenti-assenze":
      return describeTipiAssenzaChanges(before.tipiAssenza, after.tipiAssenza);
    case "op-stati":
      return describeStatiChanges(before.stati, after.stati);
    case "op-priorita":
      return describePrioritaChanges(before, after);
    case "mag-marche":
      return [
        ...diffStringList(before.mag.marche, after.mag.marche, "marca ricambio"),
        ...diffStringList(before.mag.mezziCompatibili, after.mag.mezziCompatibili, "compatibilità mezzo"),
        ...diffNumberRecord(
          before.mag.scontoFornitoreByMarca,
          after.mag.scontoFornitoreByMarca,
          (key) => `Sconto fornitore «${formatTitleCasePhrase(key)}»`,
          "%",
        ),
      ];
    case "mag-fornitori":
      return diffStringList(before.mag.fornitori, after.mag.fornitori, "fornitore alternativo");
    case "mag-categorie":
      return diffStringList(before.mag.categorie, after.mag.categorie, "categoria");
    case "cli-cliente":
      return [
        ...diffStringList(before.liste.clienti, after.liste.clienti, "cliente"),
        ...diffNumberRecord(
          before.liste.scontoRicambiByCliente,
          after.liste.scontoRicambiByCliente,
          (key) => `Sconto ricambi cliente «${formatTitleCasePhrase(key)}»`,
          "%",
        ),
      ];
    case "cli-cantiere":
      return diffStringList(before.liste.cantieri, after.liste.cantieri, "cantiere");
    case "cli-utilizzatore":
      return diffStringList(before.liste.utilizzatori, after.liste.utilizzatori, "utilizzatore");
    case "att-tipo":
      return diffStringList(before.liste.tipiAttrezzatura, after.liste.tipiAttrezzatura, "tipo attrezzatura");
    case "att-marca":
      return describeHierarchyChanges(before.liste.attrezzature, after.liste.attrezzature, "attrezzatura");
    case "tel-tipo":
      return diffStringList(before.liste.tipiTelaio ?? [], after.liste.tipiTelaio ?? [], "tipo telaio");
    case "tel-marca":
      return describeHierarchyChanges(before.liste.telai, after.liste.telai, "telaio");
    case "sys-economici": {
      const lines: string[] = [];
      if (before.eco.costoOrarioDefault !== after.eco.costoOrarioDefault) {
        lines.push(
          `Costo orario default: da ${before.eco.costoOrarioDefault} a ${after.eco.costoOrarioDefault} €/h`,
        );
      }
      return lines;
    }
    default:
      return [];
  }
}

function buildModificaRigaForSection(
  id: ConfigurazioneSectionId,
  before: ConfigurazioneSettingsSnapshot,
  after: ConfigurazioneSettingsSnapshot,
  autore: string,
): string {
  const label = CONFIGURAZIONE_SECTION_LABELS[id];
  const header = `${autore} ha aggiornato «${label}»`;
  const allDetails = describeSectionChanges(id, before, after);
  const details = allDetails.slice(0, MAX_DETAIL_LINES);
  if (details.length === 0) return toBulletModificaRiga([header]);
  const overflow = allDetails.length - details.length;
  const lines = [header, ...details];
  if (overflow > 0) lines.push(`… e altre ${overflow} modifiche`);
  return toBulletModificaRiga(lines);
}

/** Voci log per ogni sezione configurazione modificata al salvataggio. */
export function buildConfigurazioneLogEntriesFromSnapshotDiff(
  before: ConfigurazioneSettingsSnapshot,
  after: ConfigurazioneSettingsSnapshot,
  autore: string,
): GestionaleLogViewModel[] {
  const name = autore.trim() || "Operatore";
  const atIso = new Date().toISOString();
  const changed = new Set<ConfigurazioneSectionId>();

  for (const { id, pick } of SECTION_SLICES) {
    if (sliceKey(pick(before)) !== sliceKey(pick(after))) {
      changed.add(id);
    }
  }

  if (changed.size === 0) {
    return [
      {
        tone: "update",
        tipoRiga: "MODIFICA CONFIGURAZIONE",
        oggettoRiga: "Configurazione globale",
        modificaRiga: `• ${name} ha salvato la configurazione`,
        autore: name,
        atIso,
      },
    ];
  }

  const out: GestionaleLogViewModel[] = [];
  const skipIds = new Set<ConfigurazioneSectionId>(["att-modello", "tel-modello"]);

  for (const id of SECTION_SLICES.map((s) => s.id)) {
    if (!changed.has(id) || skipIds.has(id)) continue;

    const label = CONFIGURAZIONE_SECTION_LABELS[id];
    out.push({
      tone: "update",
      tipoRiga: "MODIFICA CONFIGURAZIONE",
      oggettoRiga: label,
      modificaRiga: buildModificaRigaForSection(id, before, after, name),
      autore: name,
      atIso,
    });
  }

  return out;
}
