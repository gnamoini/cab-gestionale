/**
 * Audit display portale clienti — SSOT dominio, no placeholder, no UUID in UI.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const rowFields = read("lib/lavorazioni/client-portal-row-fields.ts");
assert.match(rowFields, /lavorazioneCantiereLabel/);
assert.match(rowFields, /lavorazioneAddettoLabel/);
assert.doesNotMatch(rowFields, /addettiGlobali\[0\]/);

const listView = read("components/lavorazioni-clienti/client-lavorazioni-view.tsx");
assert.match(listView, /useLavorazioneProfileNamesQuery/);
assert.match(listView, /omitUnresolvedAutore:\s*true/);
assert.doesNotMatch(listView, /addettiGlobali\[0\]/);

const timeline = read("components/lavorazioni-clienti/client-lavorazione-timeline-panel.tsx");
assert.match(timeline, /useLavorazioneProfileNamesQuery/);
assert.match(timeline, /omitUnresolvedAutore:\s*true/);

const ultimaModifica = read("lib/lavorazioni/lavorazione-ultima-modifica.ts");
assert.match(ultimaModifica, /sanitizeClientPortalAutore/);
assert.match(ultimaModifica, /omitUnresolvedAutore/);

const profileFetch = read("lib/lavorazioni/lavorazioni-profile-names-fetch.ts");
assert.match(profileFetch, /cognome/);

const profileAccount = read("components/profile/profile-account-section.tsx");
assert.match(profileAccount, /user\.givenName/);
assert.match(profileAccount, /user\.cognome/);
assert.match(profileAccount, /if \(!isCliente\) \{[\s\S]*ID utente/);

const profileHeader = read("components/profile/profile-sheet-header.tsx");
assert.match(profileHeader, /profileDisplayName/);
assert.doesNotMatch(profileHeader, /resolveProfileRoleDescription/);

const profileSheet = read("components/profile/profile-sheet.tsx");
assert.match(profileSheet, /gestionaleLogDrawerFooterClass/);
assert.match(profileSheet, /ProfileVersionFooter/);

const profileVersionFooter = read("components/profile/profile-version-footer.tsx");
assert.match(profileVersionFooter, /PrivacyPolicyLink/);

const privacyPolicyLink = read("components/legal/privacy-policy-link.tsx");
assert.match(privacyPolicyLink, /buildPrivacyPolicyHref/);

const privacyPolicyReturn = read("lib/legal/privacy-policy-return.ts");
assert.match(privacyPolicyReturn, /sanitizePrivacyPolicyReturnPath/);

const schedeFetch = read("lib/schede/schede-bundles-fetch-authorized.ts");
assert.match(schedeFetch, /clientPortal/);
assert.match(schedeFetch, /ensureClientLavorazioniAccess/);

const portalContract = read("src/hooks/use-client-portal-data-contract.ts");
assert.match(portalContract, /clientPortal:\s*true/);

const listFetch = read("lib/lavorazioni/lavorazioni-list-fetch.ts");
assert.match(listFetch, /MEZZI_EMBED_CLIENT_PORTAL_COLUMNS|clientPortal/);

assert.match(listView, /useUndoableLog/);
assert.match(listView, /groupLavorazioniLogsById/);
assert.match(listView, /logsByLavorazioneId/);

const profileContext = read("components/profile/profile-context-section.tsx");
assert.match(profileContext, /useClientePortalAnagrafica/);
assert.match(profileContext, /La tua azienda/);
assert.match(profileContext, /Azienda/);

const anagraficaService = read("src/services/clienti-anagrafica.service.ts");
assert.match(anagraficaService, /getOwnForClientePortal/);

console.log("client-portal-cliente-display-audit.test.ts OK");
