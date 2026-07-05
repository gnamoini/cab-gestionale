/**
 * Audit alert/banner portale clienti — nessun avviso operativo interno.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const ingresso = read("components/lavorazioni-clienti/client-lavorazione-ingresso-dialog.tsx");
assert.doesNotMatch(ingresso, /Scheda ingresso non ancora compilata/i);
assert.doesNotMatch(ingresso, /metadati in sola lettura/i);
assert.doesNotMatch(ingresso, /file_esterno/);

const lavorazioniBridge = read("src/components/admin-lavorazioni-notification-bridge.tsx");
assert.match(lavorazioniBridge, /isStaffInboxEligible/);
assert.match(lavorazioniBridge, /if \(!staffEligible/);
assert.doesNotMatch(lavorazioniBridge, /fanoutClientPortalLavorazioneNotification/);

const triggersMigration = read("supabase/migrations/20260906130000_client_portal_notifications_db_triggers.sql");
assert.match(triggersMigration, /trg_lavorazioni_client_portal_ingresso/);
assert.match(triggersMigration, /trg_lavorazioni_client_portal_completata/);
assert.match(triggersMigration, /on conflict \(dedup_key\) do nothing/);

const notificationMount = read("components/gestionale/notification-center-mount.tsx");
assert.match(notificationMount, /isStaffInboxEligible/);
assert.match(notificationMount, /isClientInboxEligible/);

const notificationCenterHook = read("src/hooks/gestionale/use-notification-center.ts");
assert.match(notificationCenterHook, /isClientInboxEligible/);

console.log("client-portal-alerts-audit.test.ts OK");
