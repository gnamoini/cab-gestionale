import assert from "node:assert/strict";
import { REPORT_SECTIONS } from "@/components/report/report-sections-config";

const recidivita = REPORT_SECTIONS.find((s) => s.id === "recidivita_mezzi");
assert.ok(recidivita);
assert.ok(recidivita.permissionAny?.includes("lavorazioni"));
assert.ok(recidivita.permissionAny?.includes("mezzi"));

console.log("mezzi-storico-lavorazioni report section: ok");
