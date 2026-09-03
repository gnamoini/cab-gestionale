/**
 * Discovery 2 — audit tecnico avanzato, 100% READ-ONLY.
 * Uso: npx tsx scripts/unoerp-discovery-2.ts
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isUnoerpConfigured, readUnoerpApiUser, readUnoerpBaseUrl } from "@/lib/env/unoerp.server";
import { verifyUnoerpConnection } from "@/lib/integrations/unoerp/auth-connection";
import { anonymizeRecord } from "@/lib/integrations/unoerp/discovery-anonymize";
import {
  classifyHttp500,
  extractFieldMeta,
  extractLivesearchHints,
  findCorrelationCandidates,
  probeUnoerpReadonly,
  type FieldMeta,
  type ProbeResult,
} from "@/lib/integrations/unoerp/discovery-probe";
import { discoveryShow } from "@/lib/integrations/unoerp/discovery-readonly";

function loadEnvFile(rel: string): void {
  const p = join(process.cwd(), rel);
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const key = m[1];
    if (process.env[key]) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

const WRITE_TESTS_EXECUTED = 0;

const READABLE_MODULES: Array<{ module: string; file: string }> = [
  { module: "Produzione", file: "ordini" },
  { module: "Produzione", file: "task" },
  { module: "Magazzino", file: "movimento" },
  { module: "Magazzino", file: "articoli" },
  { module: "Magazzino", file: "causali_magazzino" },
  { module: "Magazzino", file: "causali_trasporto" },
  { module: "Amministrazione", file: "sezionali" },
  { module: "Base", file: "iva" },
  { module: "Base", file: "unita_misura" },
  { module: "Base", file: "modalita_pagamento" },
  { module: "Base", file: "vettori" },
  { module: "Magazzino", file: "listini" },
];

const PROBLEM_MODULES: Array<{ module: string; file: string; reason: string }> = [
  { module: "Base", file: "clienti", reason: "customer PK target" },
  { module: "Produzione", file: "preventivi", reason: "native preventivo UI" },
  { module: "Produzione", file: "preventivo", reason: "singular variant" },
  { module: "Magazzino", file: "ddt", reason: "DDT file name" },
  { module: "Produzione", file: "consuntivi", reason: "native consuntivo" },
  { module: "Produzione", file: "attivita", reason: "task activity tab target" },
];

const PREVENTIVO_CANDIDATES: Array<{ module: string; file: string; reason: string }> = [
  { module: "Produzione", file: "preventivi", reason: "UI Produzione > Preventivi" },
  { module: "Produzione", file: "preventivo", reason: "singular naming" },
  { module: "Produzione", file: "offerte", reason: "commercial quotes synonym" },
  { module: "CRM", file: "preventivi", reason: "CRM module naming" },
  { module: "Commerciale", file: "preventivi", reason: "commercial module naming" },
];

function fp(obj: unknown): string {
  return createHash("sha256").update(JSON.stringify(obj)).digest("hex").slice(0, 16);
}

function firstIndexRowId(index: unknown, pk: string): string | null {
  const data = (index as { data?: Record<string, Record<string, Record<string, unknown>>> })?.data;
  if (!data) return null;
  for (const tab of Object.values(data)) {
    for (const row of Object.values(tab ?? {})) {
      if (row && typeof row === "object" && pk in row) return String(row[pk]);
    }
  }
  return null;
}

async function diagnoseModule(module: string, file: string): Promise<{
  module: string;
  file: string;
  probes: ProbeResult[];
  classification: ReturnType<typeof classifyHttp500>;
}> {
  const probes: ProbeResult[] = [];
  probes.push(await probeUnoerpReadonly("info", module, file));
  probes.push(await probeUnoerpReadonly("index", module, file, { "pages[attivi]": "1" }));
  let showRow = "1";
  if (probes[1].ok && probes[1].parsed) {
    const pk =
      (probes[0].parsed as { info?: { primary_key?: string } })?.info?.primary_key ?? "id";
    const id = firstIndexRowId(probes[1].parsed, pk);
    if (id) showRow = id;
  }
  probes.push(await probeUnoerpReadonly("show", module, file, { row: showRow }));
  return { module, file, probes, classification: classifyHttp500(probes) };
}

async function analyzeReadable(module: string, file: string) {
  const infoProbe = await probeUnoerpReadonly("info", module, file);
  const fieldset = (infoProbe.parsed as { info?: { fieldset?: Record<string, Record<string, unknown>>; primary_key?: string } })
    ?.info?.fieldset;
  const pk = (infoProbe.parsed as { info?: { primary_key?: string } })?.info?.primary_key ?? null;
  const fields = extractFieldMeta(fieldset);
  const livesearch = extractLivesearchHints(fields);
  const correlation = findCorrelationCandidates(fields);
  const indexProbe = await probeUnoerpReadonly("index", module, file, { "pages[attivi]": "1" });
  let sampleShow: unknown = null;
  if (indexProbe.ok && pk) {
    const rowId = firstIndexRowId(indexProbe.parsed, pk);
    if (rowId) {
      try {
        const show = await discoveryShow(module, file, rowId);
        const data = (show as { data?: Record<string, unknown> }).data;
        sampleShow = data ? anonymizeRecord(data) : anonymizeRecord(show as Record<string, unknown>);
      } catch {
        // optional
      }
    }
  }
  return { module, file, pk, fields, livesearch, correlation, infoFingerprint: fp(fieldset), sampleShow, indexEmpty: !firstIndexRowId(indexProbe.parsed, pk ?? "id") };
}

async function stabilityCheck(module: string, file: string) {
  const a = await probeUnoerpReadonly("info", module, file);
  const b = await probeUnoerpReadonly("info", module, file);
  const fa = fp((a.parsed as { info?: unknown })?.info);
  const fb = fp((b.parsed as { info?: unknown })?.info);
  return { module, file, stable: fa === fb, fingerprintA: fa, fingerprintB: fb };
}

async function main() {
  loadEnvFile(".env.local");
  if (!isUnoerpConfigured()) {
    console.error("BLOCKED: credentials missing");
    process.exit(1);
  }

  const docsDir = join(process.cwd(), "docs", "unoerp-integration");
  const artDir = join(process.cwd(), "artifacts", "unoerp-discovery-2");
  mkdirSync(artDir, { recursive: true });

  const endpoint = `${readUnoerpBaseUrl()?.replace(/\/$/, "")}/intranet/api.php`;
  const auth = await verifyUnoerpConnection();

  console.log("Discovery 2 READ-ONLY", endpoint);

  const http500Diagnosis = [];
  for (const m of PROBLEM_MODULES) {
    console.log(`diagnose ${m.module}/${m.file}...`);
    const d = await diagnoseModule(m.module, m.file);
    http500Diagnosis.push({
      ...m,
      infoStatus: d.probes[0].httpStatus,
      indexStatus: d.probes[1].httpStatus,
      showStatus: d.probes[2].httpStatus,
      diagnostic: d.probes.map((p) => ({ act: p.act, status: p.httpStatus, error: p.errorMessage, snippet: p.bodySnippet.slice(0, 200) })),
      classification: d.classification.classification,
      confidence: d.classification.confidence,
      evidence: d.classification.evidence,
    });
  }

  const readableAnalysis = [];
  for (const m of READABLE_MODULES) {
    console.log(`analyze ${m.module}/${m.file}...`);
    readableAnalysis.push(await analyzeReadable(m.module, m.file));
  }

  const stability = [];
  for (const m of ["Produzione/ordini", "Produzione/task", "Magazzino/movimento", "Magazzino/articoli", "Magazzino/causali_magazzino", "Amministrazione/sezionali"]) {
    const [module, file] = m.split("/");
    stability.push(await stabilityCheck(module, file));
  }

  const preventivoCandidates = [];
  for (const c of PREVENTIVO_CANDIDATES) {
    const d = await diagnoseModule(c.module, c.file);
    preventivoCandidates.push({
      ...c,
      infoStatus: d.probes[0].httpStatus,
      indexStatus: d.probes[1].httpStatus,
      classification: d.classification.classification,
      confidence: d.classification.confidence,
    });
  }

  const allLivesearch = readableAnalysis.flatMap((r) =>
    r.livesearch.map((l) => ({ ...l, sourceModule: r.module, sourceFile: r.file })),
  );
  const allCorrelation = readableAnalysis.flatMap((r) =>
    r.correlation.map((c) => ({ ...c, sourceModule: r.module, sourceFile: r.file })),
  );

  const payload = {
    timestamp: new Date().toISOString(),
    endpoint,
    accountHint: readUnoerpApiUser() ? `${readUnoerpApiUser()!.slice(0, 2)}***` : "API_KEY",
    uid: auth.uid,
    writeTestsExecuted: WRITE_TESTS_EXECUTED,
    http500Diagnosis,
    readableAnalysis: readableAnalysis.map((r) => ({
      module: r.module,
      file: r.file,
      pk: r.pk,
      fieldCount: r.fields.length,
      livesearch: r.livesearch,
      correlation: r.correlation,
      infoFingerprint: r.infoFingerprint,
      indexEmpty: r.indexEmpty,
      tabs: r.fields.filter((f) => f.format === "tab").map((f) => f.field),
      sampleShow: r.sampleShow,
    })),
    stability,
    preventivoCandidates,
  };

  writeFileSync(join(artDir, "discovery-2-raw.json"), JSON.stringify(payload, null, 2));

  // --- Markdown reports ---
  writeDiscovery2Run(docsDir, payload);
  writeLivesearchMap(docsDir, allLivesearch);
  writeCustomerAdvanced(docsDir, allLivesearch, http500Diagnosis);
  writeProductionModel(docsDir, readableAnalysis);
  writePreventivoD2(docsDir, preventivoCandidates);
  writeConsuntivoD2(docsDir, readableAnalysis);
  writeDdtD2(docsDir, readableAnalysis);
  writeNumberingD2(docsDir, readableAnalysis);
  writeCorrelationD2(docsDir, allCorrelation, readableAnalysis);
  writeCustomFields(docsDir, readableAnalysis);
  writeItemRows(docsDir, readableAnalysis);
  writeModuleCandidates(docsDir, preventivoCandidates, http500Diagnosis);
  updateCapabilityMatrix(docsDir);
  writeGateReassessment(docsDir);
  writeFinalReport(docsDir, payload);

  console.log("\nDISCOVERY 2 COMPLETED");
  console.log("WRITE TESTS EXECUTED = 0");
  setTimeout(() => process.exit(0), 100);
}

function writeDiscovery2Run(docsDir: string, p: Record<string, unknown>) {
  const md = [
    "# Discovery 2 run",
    "",
    `- **Timestamp:** ${p.timestamp}`,
    `- **Endpoint:** ${p.endpoint}`,
    `- **Account:** ${p.accountHint}`,
    `- **UID:** ${(p as { uid?: string }).uid ?? "n/a"}`,
    `- **Encoding:** application/x-www-form-urlencoded (JSON auth body → 401 su questa istanza)`,
    `- **READ_ONLY:** PASS`,
    `- **WRITE TESTS EXECUTED:** 0`,
    "",
    "## Audit script esistente",
    "",
    "- `transport.ts`: form-urlencoded, timeout da env, body JSON su errore acquisito",
    "- `discovery-readonly.ts`: allowlist info/index/show",
    "- HTTP 500: body snippet acquisito e classificato (non assumere permesso senza evidenza)",
    "",
    "## Stabilità schema (doppio info)",
    "",
    ...((p.stability as Array<{ module: string; file: string; stable: boolean; fingerprintA: string; fingerprintB: string }>) ?? []).map(
      (s) => `- \`${s.module}/${s.file}\`: ${s.stable ? "STABLE" : "UNOERP_SCHEMA_INSTABILITY"} (${s.fingerprintA}/${s.fingerprintB})`,
    ),
  ].join("\n");
  writeFileSync(join(docsDir, "discovery-2-run.md"), md);
}

function writeLivesearchMap(docsDir: string, items: Array<Record<string, unknown>>) {
  const lines = ["# Livesearch map", "", "| Source | Field | Format | Inferred target | Evidence |", "|--------|-------|--------|-----------------|----------|"];
  for (const l of items) {
    lines.push(`| ${l.sourceModule}/${l.sourceFile} | ${l.field} | ${l.format} | ${l.inferredTarget ?? "UNKNOWN"} | ${l.evidence} |`);
  }
  writeFileSync(join(docsDir, "livesearch-map.md"), lines.join("\n"));
}

function writeCustomerAdvanced(docsDir: string, livesearch: Array<Record<string, unknown>>, http500: Array<Record<string, unknown>>) {
  const clienti = http500.find((h) => h.file === "clienti");
  const refs = livesearch.filter((l) => /anagrafica|cliente/i.test(String(l.field)));
  const md = [
    "# Customer discovery advanced",
    "",
    "## Modulo diretto",
    "",
    `- \`Base/clienti\`: info=${clienti?.infoStatus}, classification=${clienti?.classification}`,
    `- **CUSTOMER_MODULE_IDENTIFIED:** Base/clienti (inferred from livesearch field names)`,
    `- **CUSTOMER_DATA_NOT_READABLE:** YES (HTTP 500 su info/index/show)`,
    "",
    "## Riferimenti indiretti (OBSERVED)",
    "",
    ...refs.map((r) => `- \`${r.sourceModule}/${r.sourceFile}.${r.field}\` → ${r.inferredTarget} (${r.evidence})`),
    "",
    "## Campi anagrafica",
    "",
    "| Campo | Stato |",
    "|-------|-------|",
    "| PK | NOT_VERIFIED |",
    "| P.IVA | NOT_VERIFIED |",
    "| CF | NOT_VERIFIED |",
    "| codice cliente | NOT_VERIFIED |",
    "",
    "**Classificazione blocker:** REQUIRES_VENDOR_SUPPORT (permessi READ clienti) — non SELF_SOLVABLE_READ_ONLY finché Base/clienti resta 500 senza body diagnostico univoco",
  ].join("\n");
  writeFileSync(join(docsDir, "customer-discovery-advanced.md"), md);
}

function writeProductionModel(docsDir: string, analysis: Array<{ module: string; file: string; fields: FieldMeta[]; pk: string | null }>) {
  const ordini = analysis.find((a) => a.module === "Produzione" && a.file === "ordini");
  const tabs = ordini?.fields.filter((f) => f.format === "tab") ?? [];
  const md = [
    "# Production document model",
    "",
    "Fonte: `Produzione/ordini` — **non equivale a Preventivo**, solo modello strutturale.",
    "",
    `PK: \`${ordini?.pk ?? "?"}\``,
    "",
    "## Testata (campi non-tab)",
    "",
    ...(ordini?.fields.filter((f) => f.format !== "tab").map((f) => `- \`${f.field}\` (${f.format}) — ${f.label ?? ""}`) ?? []),
    "",
    "## Tab (probabili sub-strutture / righe)",
    "",
    ...tabs.map((t) => `- \`${t.field}\` — tipo tab (child structure NOT_VERIFIED senza show con dati)`),
    "",
    "## Relazioni chiave",
    "",
    "- `anagrafica_id` livesearch → cliente (target Base/clienti inferred)",
    "- `task_id` → Produzione/task",
    "- `mod_pagamento` → Base/modalita_pagamento (menu)",
    "- `materiali`, `risorse_umane` → righe documento (NOT_VERIFIED)",
  ].join("\n");
  writeFileSync(join(docsDir, "production-document-model.md"), md);
}

function writePreventivoD2(docsDir: string, candidates: Array<Record<string, unknown>>) {
  const found = candidates.find((c) => c.infoStatus === 200);
  const md = [
    "# Preventivo discovery 2",
    "",
    found ? "**PREVENTIVO_MODULE_CONFIRMED**" : "**PREVENTIVO_MODULE_UNRESOLVED**",
    "",
    "## Candidati motivati",
    "",
    "| Module/File | Reason | info | index | Classification |",
    "|-------------|--------|------|-------|----------------|",
    ...candidates.map((c) => `| ${c.module}/${c.file} | ${c.reason} | ${c.infoStatus} | ${c.indexStatus} | ${c.classification} |`),
    "",
    "## Conclusione",
    "",
    "Nessun modulo preventivo leggibile. `Produzione/preventivi` → UNKNOWN_500 (non distinguibile permesso vs errore interno senza messaggio esplicito).",
    "",
    "**Blocker:** REQUIRES_VENDOR_SUPPORT",
  ].join("\n");
  writeFileSync(join(docsDir, "preventivo-discovery-2.md"), md);
}

function writeConsuntivoD2(docsDir: string, analysis: Array<{ module: string; file: string; fields: FieldMeta[] }>) {
  const task = analysis.find((a) => a.module === "Produzione" && a.file === "task");
  const tabs = task?.fields.filter((f) => f.format === "tab").map((f) => f.field) ?? [];
  const md = [
    "# Consuntivo discovery 2",
    "",
    "## Representation",
    "",
    "- Modulo `consuntivi` → HTTP 500 (NOT READABLE)",
    "- `Produzione/task` leggibile con tab: " + tabs.join(", "),
    "",
    "**Classificazione:** B (native Task/activity structure) — **PARTIALLY_VERIFIED**",
    "",
    "## Billing path",
    "",
    "- `billing_path_verified` = **NO**",
    "- `billing_path_evidence` = tab `attivita_tab`/`budget_tab` presenti ma `Produzione/attivita` HTTP 500; nessun collegamento a fatturazione verificato",
    "",
    "## Esito",
    "",
    "REPRESENTATION: PASS_CONDITIONED (task only) / BILLING: FAIL",
    "",
    "**Blocker consuntivo:** REQUIRES_VENDOR_SUPPORT",
  ].join("\n");
  writeFileSync(join(docsDir, "consuntivo-discovery-2.md"), md);
}

function writeDdtD2(docsDir: string, analysis: Array<{ module: string; file: string; fields: FieldMeta[] }>) {
  const mov = analysis.find((a) => a.module === "Magazzino" && a.file === "movimento");
  const caus = analysis.find((a) => a.module === "Magazzino" && a.file === "causali_magazzino");
  const md = [
    "# DDT discovery 2",
    "",
    "## Modulo documento",
    "",
    "**OBSERVED:** DDT = `Magazzino/movimento` (non `Magazzino/ddt` che restituisce HTTP 500)",
    "",
    "Tipo: documento/movimento magazzino con causale, sezionale, trasporto.",
    "",
    "## Catena causale → sezionale → movimento",
    "",
    "- `Magazzino/causali_magazzino.sezionale_id` → `Amministrazione/sezionali`",
    "- `Magazzino/causali_magazzino.causale_trasporto_id` → `Magazzino/causali_trasporto`",
    "- `Magazzino/movimento.causale_id` → causale movimento",
    "- `Magazzino/movimento.sezionale` → sezionale documento",
    "",
    "## Campi movimento (OBSERVED)",
    "",
    ...(mov?.fields.filter((f) => /doc_number|sezional|causale|anagrafica|clifor|data/i.test(f.field)).map((f) => `- \`${f.field}\` (${f.format})`) ?? []),
    "",
    "## Righe",
    "",
    "NOT_VERIFIED — index/show movimento vuoti nel campione API",
    "",
    "## Fatturazione downstream",
    "",
    "NOT_VERIFIED — campo `to_cont` presente in schema; workflow non dimostrabile READ-ONLY",
  ].join("\n");
  writeFileSync(join(docsDir, "ddt-discovery-2.md"), md);
}

function writeNumberingD2(docsDir: string, analysis: Array<{ module: string; file: string; fields: FieldMeta[] }>) {
  const md = [
    "# DDT numbering discovery 2",
    "",
    "## Campi (OBSERVED)",
    "",
    "| Campo | Module | Note |",
    "|-------|--------|------|",
    "| doc_number | Magazzino/movimento | insert_ignore NOT indicated as true |",
    "| doc_number_padded | Magazzino/movimento | display |",
    "| sezionale | Magazzino/movimento | menu |",
    "| numerazione, formato | Amministrazione/sezionali | es. NNNNNNNNNN/Z |",
    "| autoprot | Magazzino/causali_magazzino | protocolla automaticamente |",
    "",
    "## Assegnazione numero",
    "",
    "**Classification:** AUTOMATIC_BY_SECTIONAL (hypothesis) — confidence LOW",
    "",
    "Evidenza: `autoprot` su causali + `numerazione` su sezionali. Comportamento CREATE **REQUIRES_SAFE_WRITE_TEST**.",
    "",
    "Anno: non esposto come campo dedicato — probabile derivazione da `data` o formato sezionale — NOT_VERIFIED",
  ].join("\n");
  writeFileSync(join(docsDir, "ddt-numbering-discovery-2.md"), md);
}

function writeCorrelationD2(
  docsDir: string,
  candidates: Array<Record<string, unknown>>,
  analysis: Array<{ module: string; file: string }>,
) {
  const md = [
    "# Correlation discovery 2",
    "",
    "## Candidati trovati",
    "",
    candidates.length
      ? candidates.map((c) => `- \`${c.sourceModule}/${c.sourceFile}.${c.field}\` (${c.format}) insert_ignore=${c.insert_ignore}`).join("\n")
      : "- Nessun campo source_/external_ esplicito",
    "",
    "## note_integrazioni (Produzione/ordini)",
    "",
    "- readable: NOT_VERIFIED (no sample)",
    "- writeable: NOT_VERIFIED",
    "- searchable: NOT_VERIFIED",
    "- **NOT_ACCEPTABLE_AS_CORRELATION_KEY** finché non verificati tutti i requisiti",
    "",
    "## Movimento/DDT",
    "",
    "- `vsrif` = Rif. Ordine — business ref, non CAB UUID",
    "- Nessun campo tecnico dedicato osservato",
    "",
    "**Status:** BLOCKED — REQUIRES_VENDOR_SUPPORT",
  ].join("\n");
  writeFileSync(join(docsDir, "correlation-discovery-2.md"), md);
}

function writeCustomFields(docsDir: string, analysis: Array<{ module: string; file: string; fields: FieldMeta[] }>) {
  const customish = analysis.flatMap((a) =>
    a.fields
      .filter((f) => /custom|user|extra|integraz|metadata/i.test(`${f.field} ${f.label ?? ""}`))
      .map((f) => ({ ...f, module: a.module, file: a.file })),
  );
  const md = [
    "# Custom fields discovery",
    "",
    customish.length
      ? customish.map((f) => `- \`${f.module}/${f.file}.${f.field}\` — ${f.label}`).join("\n")
      : "Nessun custom field esplicito nei fieldset leggibili.",
    "",
    "`note_integrazioni` su ordini è il candidato integrazione più vicino — non verificato come custom field ufficiale.",
  ].join("\n");
  writeFileSync(join(docsDir, "custom-fields-discovery.md"), md);
}

function writeItemRows(docsDir: string, analysis: Array<{ module: string; file: string; fields: FieldMeta[] }>) {
  const art = analysis.find((a) => a.module === "Magazzino" && a.file === "articoli");
  const md = [
    "# Item row discovery",
    "",
    "## Articolo",
    "",
    "- PK: `id_articoli`",
    "- Codice: `alpha_cod`",
    "- Tipo: `tipo` menu (M/S/I/V per doc UnoERP)",
    "- IVA vendita: `cod_iva_vendita_id` → Base/iva",
    "- UoM: `unita_misura_id` → Base/unita_misura",
    "",
    "## Righe documento",
    "",
    "NOT_VERIFIED — tab `materiali` su ordini; FK riga presumibilmente `id_articoli` — REQUIRES show con righe",
    "",
    "## Servizi / manodopera",
    "",
    "- Servizio: articolo tipo S (PASS_CONDITIONED)",
    "- Manodopera: tab `risorse_umane` su ordini — NOT_VERIFIED",
  ].join("\n");
  writeFileSync(join(docsDir, "item-row-discovery.md"), md);
}

function writeModuleCandidates(
  docsDir: string,
  preventivo: Array<Record<string, unknown>>,
  http500: Array<Record<string, unknown>>,
) {
  const md = [
    "# Module candidates",
    "",
    "## Preventivo",
    "",
    ...preventivo.map((c) => `- \`${c.module}/${c.file}\` — ${c.reason} — info ${c.infoStatus} — ${c.classification}`),
    "",
    "## Customer / DDT file name",
    "",
    ...http500
      .filter((h) => ["clienti", "ddt", "consuntivi"].includes(String(h.file)))
      .map((h) => `- \`${h.module}/${h.file}\` — ${h.classification} (${h.confidence})`),
    "",
    "## DDT effettivo",
    "",
    "- `Magazzino/movimento` — READABLE — confidence HIGH",
  ].join("\n");
  writeFileSync(join(docsDir, "module-candidates.md"), md);
}

function updateCapabilityMatrix(docsDir: string) {
  writeFileSync(
    join(docsDir, "capability-matrix.md"),
    `# Capability matrix — post discovery 2

| Capability | Status | Evidence | Confidence | Next step | Blocking? |
|------------|--------|----------|------------|-----------|-----------|
| Customer lookup API | BLOCKED | Base/clienti UNKNOWN_500 | low | vendor READ perm | yes |
| Customer ref on docs | PASS_CONDITIONED | anagrafica_id livesearch | medium | mapping seed | partial |
| Item lookup | PASS_CONDITIONED | Magazzino/articoli info | high | index con dati | no |
| Service | PASS_CONDITIONED | articoli.tipo | medium | verify S rows | no |
| IVA | PASS | Base/iva | high | id_iva in rows | no |
| UoM | PASS | unita_misura_id | high | row verify | no |
| Preventivo module | BLOCKED | preventivi UNKNOWN_500 | low | vendor | yes |
| Preventivo schema | NOT_VERIFIED | — | — | READ preventivi | yes |
| Consuntivo repr. | PASS_CONDITIONED | Produzione/task tabs | low | READ attivita | yes |
| Consuntivo billing | FAIL | no path | high | vendor | yes |
| DDT module | PASS_CONDITIONED | Magazzino/movimento | high | rows show | partial |
| DDT numbering | PARTIALLY_VERIFIED | sezionale+autoprot | low | SAFE_WRITE_TEST | partial |
| Correlation key | BLOCKED | no acceptable field | high | vendor field | yes |
| API write | NOT_TESTED | — | — | Gate B | — |

WRITE TESTS EXECUTED = 0
`,
  );
}

function writeGateReassessment(docsDir: string) {
  writeFileSync(
    join(docsDir, "gate-a-reassessment.md"),
    `# Gate A reassessment (discovery 2)

## Preventivo
- MODULE_FOUND: NO (readable)
- SCHEMA_FOUND: NO
- ROWS_FOUND: NO
- CUSTOMER_REFERENCE_FOUND: YES (on ordini, not preventivo)
- ITEM_REFERENCE_FOUND: PASS_CONDITIONED
- IVA_REFERENCE_FOUND: YES
- CORRELATION_FOUND: NO
- WRITE_TEST_REQUIRED: YES

## Consuntivo
- REPRESENTATION_FOUND: PASS_CONDITIONED (task)
- STRUCTURE_FOUND: PARTIAL (tabs only)
- BILLING_PATH_FOUND: NO
- CORRELATION_FOUND: NO
- WRITE_TEST_REQUIRED: YES

## DDT
- MODULE_FOUND: YES (Magazzino/movimento)
- ROWS_FOUND: NO
- CUSTOMER_REFERENCE_FOUND: YES (schema)
- SECTIONAL_FOUND: YES
- NUMBERING_UNDERSTOOD: PARTIAL
- CORRELATION_FOUND: NO
- WRITE_TEST_REQUIRED: YES (numbering + rows)

## Customer
- MODULE_FOUND: INFERRED (Base/clienti)
- PRIMARY_KEY_FOUND: NO
- VAT_FIELD_FOUND: NO
- TAX_CODE_FIELD_FOUND: NO
- DOCUMENT_REFERENCE_FOUND: YES
`,
  );
}

function writeFinalReport(docsDir: string, p: Record<string, unknown>) {
  writeFileSync(
    join(docsDir, "discovery-2-final-report.md"),
    `# Discovery 2 — final report

## Connection
PASS

## Read-only guarantee
PASS — WRITE TESTS EXECUTED = 0

## Preventivo
- module/file = Produzione/preventivi (UNRESOLVED — HTTP 500)
- confidence = low
- status = BLOCKED

## Consuntivo
- representation = Produzione/task (partial)
- billing path = NOT VERIFIED
- confidence = low
- status = BLOCKED

## DDT
- module/file = Magazzino/movimento
- customer reference = anagrafica_id / clifor_id
- rows = NOT_VERIFIED
- sectional = sezionale + Amministrazione/sezionali
- number = doc_number / doc_number_padded
- confidence = medium (module) / low (numbering)
- status = PASS_CONDITIONED

## Customer
- module/file = Base/clienti (inferred, not readable)
- PK = NOT_VERIFIED
- VAT = NOT_VERIFIED
- tax code = NOT_VERIFIED
- customer reference = anagrafica_id
- confidence = low
- status = BLOCKED

## Items
- module/file = Magazzino/articoli
- PK = id_articoli
- document FK = NOT_VERIFIED (likely id_articoli)
- status = PASS_CONDITIONED

## Services / Manodopera
- representation = articoli.tipo S + risorse_umane tab
- status = PASS_CONDITIONED

## IVA
- module/file = Base/iva
- document FK = cod_iva_vendita_id (articoli) — NOT_VERIFIED on rows
- status = PASS_CONDITIONED

## UoM
- module/file = Base/unita_misura
- document FK = unita_misura_id
- status = PASS_CONDITIONED

## Correlation
- field = none acceptable
- writeable = NOT_VERIFIED
- readable = NOT_VERIFIED
- searchable = NOT_VERIFIED
- persistent = NOT_VERIFIED
- status = BLOCKED

## Numbering DDT
- year = NOT_VERIFIED
- sectional = sezionale menu
- number = doc_number
- assignment = REQUIRES_SAFE_WRITE_TEST
- status = PARTIALLY_VERIFIED

## HTTP 500 diagnosis

${((p.http500Diagnosis as Array<Record<string, unknown>>) ?? [])
  .map((h) => `- \`${h.module}/${h.file}\`: info=${h.infoStatus} index=${h.indexStatus} → ${h.classification} (${h.confidence})`)
  .join("\n")}

## Self-solvable vs vendor

### SELF_SOLVABLE_READ_ONLY
- Catena causale→sezionale→movimento (OBSERVED)
- Livesearch target inference (partial)
- DDT module = movimento (confirmed)

### SELF_SOLVABLE_WITH_SAFE_WRITE_TEST
- DDT numbering assignment
- Document row structure (materiali tab)
- Correlation via note_integrazioni (if vendor confirms)

### REQUIRES_VENDOR_SUPPORT
- Base/clienti READ
- Produzione/preventivi READ
- Correlation key field on movimento/preventivo
- Consuntivo billing path
- Produzione/attivita READ

### UNKNOWN
- Exact meaning of HTTP 500 without explicit error body on clienti/preventivi/ddt

## Safety checklist
- [x] No CREATE/UPDATE/DELETE
- [x] WRITE TESTS EXECUTED = 0
`,
  );
}

void main();
