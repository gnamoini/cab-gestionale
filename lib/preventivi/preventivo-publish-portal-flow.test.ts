import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { isPreventivoVisibleToClient } from "@/lib/preventivi/preventivo-client-visibility";
import { findPoliciesForDomainEvent } from "@/lib/communications/policy/communication-policy-catalog";
import { DEFAULT_COMMUNICATION_TEMPLATES } from "@/lib/communications/template/default-templates";
import { QK, clientLavorazionePreventivoKey } from "@/src/lib/react-query/query-keys";

assert.equal(isPreventivoVisibleToClient("inviato", null, "2026-01-01T00:00:00.000Z"), true);
assert.equal(isPreventivoVisibleToClient("bozza", null), false);

const policies = findPoliciesForDomainEvent("preventivo.status_changed", { to: "inviato" });
assert.equal(policies.length, 1);
assert.equal(policies[0]?.templateKey, "estimate.published");
assert.deepEqual(policies[0]?.attachmentTypes, ["preventivo"]);

const tpl = DEFAULT_COMMUNICATION_TEMPLATES["estimate.published"].body;
assert.match(tpl, /link_lavorazione|preventivo/i);
assert.doesNotMatch(tpl, /24\s*ore|accettare|rifiutare|accettazione entro/i);

const portalPanel = readFileSync("components/lavorazioni-clienti/client-lavorazione-preventivo-panel.tsx", "utf8");
assert.match(portalPanel, /clientLavorazionePreventivoKey/);
assert.doesNotMatch(portalPanel, /respond|ACCETTA|RIFIUTA/i);

assert.ok(QK.clientLavorazionePreventivo);
assert.equal(clientLavorazionePreventivoKey("lav-1")[1], "lav-1");

function gitGrepLines(pattern: string): string[] {
  try {
    return execSync(`git grep -n -E "${pattern}"`, { encoding: "utf8" })
      .trim()
      .split("\n")
      .filter(Boolean)
      .filter((line) => !line.startsWith("test-results/"));
  } catch {
    return [];
  }
}

const respondHits = gitGrepLines("preventivo/respond").filter(
  (line) => !line.includes("preventivo-publish-portal-flow.test.ts"),
);
assert.equal(respondHits.length, 0, `preventivo/respond hits: ${respondHits.join("\n")}`);

const deadSurfacePattern =
  "respondClientPreventivoServer|buildPreventivoAcceptanceStatus|runPreventivoAcceptanceTimeoutBatch|canRespond|acceptanceStatus|remainingSeconds|estimate\\.reminder|estimate\\.accepted|estimate\\.rejected";
const deadHits = gitGrepLines(deadSurfacePattern);
const activeRuntime = deadHits.filter((line) => {
  if (line.includes("preventivo-publish-portal-flow.test.ts")) return false;
  if (line.includes("preventivo-transitions.test.ts")) return false;
  if (line.includes("preventivo-publish-flow.test.ts")) return false;
  if (line.includes("preventivo-client-portal.server.ts") && /accepted_|rejected_client/.test(line)) return false;
  return true;
});
assert.equal(activeRuntime.length, 0, `ACTIVE_RUNTIME hits: ${activeRuntime.join("\n")}`);

console.log("preventivo-publish-portal-flow.test.ts OK");
