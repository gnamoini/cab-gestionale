import assert from "node:assert/strict";
import {
  activityFeedEventBadgeClass,
  activityFeedEventRowClass,
  resolveActivityFeedStyleKey,
} from "@/lib/gestionale-log/activity-feed-event-styles";

assert.equal(resolveActivityFeedStyleKey("Ingresso"), "ingresso");
assert.equal(resolveActivityFeedStyleKey("Lavorazione aggiornata"), "lavorazione_aggiornata");
assert.equal(resolveActivityFeedStyleKey("Completata"), "completata");

const ingressoBadge = activityFeedEventBadgeClass("Ingresso");
const updateBadge = activityFeedEventBadgeClass("Lavorazione aggiornata");
const doneBadge = activityFeedEventBadgeClass("Completata");

assert.notEqual(ingressoBadge, updateBadge);
assert.notEqual(updateBadge, doneBadge);
assert.notEqual(ingressoBadge, doneBadge);

assert.match(activityFeedEventRowClass("Ingresso"), /emerald/);
assert.match(activityFeedEventRowClass("Lavorazione aggiornata"), /amber/);
assert.match(activityFeedEventRowClass("Completata"), /sky/);

console.log("activity-feed-event-styles.test.ts OK");
