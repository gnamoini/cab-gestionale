/**
 * Verifica credenziali UnoERP — solo login Basic Auth, zero read/write su moduli.
 * Uso: npx tsx scripts/unoerp-connection-test.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isUnoerpConfigured, readUnoerpBaseUrl } from "@/lib/env/unoerp.server";
import { verifyUnoerpConnection } from "@/lib/integrations/unoerp/auth-connection";

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

async function main() {
  loadEnvFile(".env.local");

  if (!isUnoerpConfigured()) {
    console.error("FAIL: credenziali incomplete.");
    console.error("Richiesto: UNOERP_BASE_URL + (UNOERP_API_KEY oppure UNOERP_API_USER + UNOERP_API_PASSWORD)");
    process.exit(1);
  }

  const base = readUnoerpBaseUrl();
  console.log(`Target: ${base?.replace(/\/$/, "")}/intranet/api.php`);
  console.log("Modalità: login only (nessun info/index/show/create/update/delete)");

  try {
    const result = await verifyUnoerpConnection();
    console.log("OK: autenticazione riuscita.");
    if (result.uid) console.log(`UID: ${result.uid}`);
    process.exit(0);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
}

void main();
