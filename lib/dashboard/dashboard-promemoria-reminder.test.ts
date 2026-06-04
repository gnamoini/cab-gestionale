import assert from "node:assert/strict";
import {
  buildDashboardPromemoriaReminderNotification,
  computePromemoriaReminderMoment,
  dashboardPromemoriaReminderStoreKey,
  formatDashboardPromemoriaReminderMessage,
  formatDashboardPromemoriaReminderToastMessage,
  isAtOrAfterPromemoriaReminderTime,
  normalizePromemoriaEventTime,
  promemoriaNeedsReminderToday,
  shouldNotifyPromemoriaNow,
  shouldRunDashboardPromemoriaReminderCheck,
} from "@/lib/dashboard/dashboard-promemoria-reminder";
import { notificationStoreKey } from "@/lib/notifications/admin-dashboard-notifications";

assert.equal(isAtOrAfterPromemoriaReminderTime(new Date(2026, 5, 1, 8, 59)), false);
assert.equal(isAtOrAfterPromemoriaReminderTime(new Date(2026, 5, 1, 9, 0)), true);
assert.equal(shouldRunDashboardPromemoriaReminderCheck(new Date(2026, 5, 6, 10, 0)), true);
assert.equal(
  dashboardPromemoriaReminderStoreKey("abc", "2026-06-01"),
  "promemoria:abc:2026-06-01",
);
assert.equal(
  formatDashboardPromemoriaReminderMessage("Revisione mezzo ABC"),
  "Promemoria: Revisione mezzo ABC previsto per oggi.",
);
assert.equal(
  formatDashboardPromemoriaReminderMessage("Call cliente", "14:30:00"),
  "Promemoria: Call cliente previsto per oggi alle 14:30.",
);
assert.equal(normalizePromemoriaEventTime("14:30"), "14:30:00");
assert.equal(normalizePromemoriaEventTime(""), null);

const untimedReminder = computePromemoriaReminderMoment("2026-06-01", null);
assert.equal(untimedReminder.getHours(), 9);
assert.equal(untimedReminder.getMinutes(), 0);

const timedReminder = computePromemoriaReminderMoment("2026-06-01", "14:30:00");
assert.equal(timedReminder.getHours(), 14);
assert.equal(timedReminder.getMinutes(), 0);

assert.equal(
  shouldNotifyPromemoriaNow(
    { event_date: "2026-06-01", event_time: null, notified_on: null },
    new Date(2026, 5, 1, 8, 59),
  ),
  false,
);
assert.equal(
  shouldNotifyPromemoriaNow(
    { event_date: "2026-06-01", event_time: null, notified_on: null },
    new Date(2026, 5, 1, 9, 0),
  ),
  true,
);
assert.equal(
  shouldNotifyPromemoriaNow(
    { event_date: "2026-06-01", event_time: "14:30:00", notified_on: null },
    new Date(2026, 5, 1, 14, 0),
  ),
  true,
);
assert.equal(
  shouldNotifyPromemoriaNow(
    { event_date: "2026-06-01", event_time: "14:30:00", notified_on: null },
    new Date(2026, 5, 1, 13, 59),
  ),
  false,
);

const n = buildDashboardPromemoriaReminderNotification({
  id: "id-1",
  event_date: "2026-06-01",
  event_time: "10:00:00",
  title: "Revisione",
  description: null,
});
assert.equal(n.kind, "dashboard_promemoria_reminder");
assert.ok(n.message.includes("10:00"));
assert.equal(notificationStoreKey(n), "promemoria:id-1:2026-06-01");
assert.equal(promemoriaNeedsReminderToday({ event_date: "2026-06-01", notified_on: null }, "2026-06-01"), true);
assert.equal(
  promemoriaNeedsReminderToday({ event_date: "2026-06-01", notified_on: "2026-06-01" }, "2026-06-01"),
  false,
);

assert.equal(
  formatDashboardPromemoriaReminderToastMessage(["Promemoria: Solo oggi."]),
  "Promemoria: Solo oggi.",
);
assert.equal(
  formatDashboardPromemoriaReminderToastMessage(["A", "B", "C"]),
  "Hai 3 promemoria oggi. Apri la Dashboard per i dettagli.",
);

console.log("dashboard-promemoria-reminder.test.ts: ok");
