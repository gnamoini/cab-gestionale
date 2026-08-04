import assert from "node:assert/strict";
import {
  communicationSettingsToPayload,
  DEFAULT_COMMUNICATION_SETTINGS,
  parseCommunicationSettings,
} from "@/lib/communications/settings/communication-settings";

const payload = communicationSettingsToPayload({
  ...DEFAULT_COMMUNICATION_SETTINGS,
  senderDisplayName: "Officina CAB",
  senderFromEmail: "noreply@resend.dev",
  replyToEmail: "officina@azienda.it",
  testEmailAddress: "test@example.com",
});

assert.equal(payload.senderDisplayName, "Officina CAB");
assert.equal(payload.senderFromEmail, "noreply@resend.dev");
assert.equal(payload.replyToEmail, "officina@azienda.it");
assert.equal(payload.testEmailAddress, "test@example.com");

const roundTrip = parseCommunicationSettings(payload);
assert.equal(roundTrip.senderDisplayName, "Officina CAB");
assert.equal(roundTrip.senderFromEmail, "noreply@resend.dev");
assert.equal(roundTrip.replyToEmail, "officina@azienda.it");

console.log("communication-settings.test.ts: ok");
