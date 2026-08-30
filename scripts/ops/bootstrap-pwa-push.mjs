#!/usr/bin/env node
/**
 * Bootstrap Web Push su Vercel + vault Supabase (one-shot ops).
 * Legge .env.local (Supabase), genera VAPID/CRON se assenti, aggiorna env Vercel.
 *
 * Uso:
 *   node scripts/ops/bootstrap-pwa-push.mjs
 *   node scripts/ops/bootstrap-pwa-push.mjs --deploy
 */
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import webpush from "web-push";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ENV_LOCAL = path.join(ROOT, ".env.local");
const PROJECT_REF = "oxmnuovsgenqkuwfolqh";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://gestionale-cab.vercel.app";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT?.trim() || "mailto:service@autocompattatori.it";
const TARGET_ENVS = ["production", "preview"];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function run(cmd, input) {
  execSync(cmd, {
    cwd: ROOT,
    stdio: input != null ? ["pipe", "inherit", "inherit"] : "inherit",
    input,
    env: process.env,
  });
}

function setVercelEnv(name, value, targets = TARGET_ENVS) {
  for (const target of targets) {
    try {
      run(`npx vercel env rm ${name} ${target} --yes`);
    } catch {
      /* missing */
    }
    try {
      run(`npx vercel env add ${name} ${target}`, `${value}\n`);
    } catch (err) {
      try {
        run(`npx vercel env rm ${name} ${target} --yes --all`);
        run(`npx vercel env add ${name} ${target}`, `${value}\n`);
      } catch {
        throw err;
      }
    }
    console.log(`[vercel] ${name} → ${target}`);
  }
}

async function setSupabaseEdgeSecrets(secrets) {
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (!token) {
    console.warn("[supabase] skip edge secrets — SUPABASE_ACCESS_TOKEN assente");
    return false;
  }
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/secrets`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(secrets),
  });
  if (!res.ok) {
    console.error(`[supabase] edge secrets failed ${res.status}: ${await res.text()}`);
    return false;
  }
  console.log("[supabase] edge secrets ok:", secrets.map((s) => s.name).join(", "));
  return true;
}

function ensureVapidKeys(local) {
  let publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || local.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  let privateKey = process.env.VAPID_PRIVATE_KEY?.trim() || local.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) {
    const keys = webpush.generateVAPIDKeys();
    publicKey = keys.publicKey;
    privateKey = keys.privateKey;
    console.log("[vapid] generated new key pair");
    const append = [
      "",
      "# Web Push (generato da scripts/ops/bootstrap-pwa-push.mjs)",
      `NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}`,
      `VAPID_PRIVATE_KEY=${privateKey}`,
      `VAPID_SUBJECT=${VAPID_SUBJECT}`,
      "PWA_PUSH_ENABLED=true",
    ].join("\n");
    fs.appendFileSync(ENV_LOCAL, append, "utf8");
    console.log("[vapid] appended keys to .env.local for stable re-runs");
  } else {
    console.log("[vapid] reusing keys from env / .env.local");
  }
  return { publicKey, privateKey };
}

async function main() {
  const local = parseEnvFile(ENV_LOCAL);
  const supabaseUrl = local.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = local.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const serviceKey = local.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !anonKey || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL / ANON_KEY / SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const cronSecret =
    process.env.CRON_SECRET?.trim() ||
    local.CRON_SECRET?.trim() ||
    crypto.randomBytes(32).toString("hex");

  if (!local.CRON_SECRET?.trim() && !process.env.CRON_SECRET?.trim()) {
    fs.appendFileSync(
      ENV_LOCAL,
      `\nCRON_SECRET=${cronSecret}\n`,
      "utf8",
    );
    console.log("[cron] appended CRON_SECRET to .env.local");
  }

  const { publicKey, privateKey } = ensureVapidKeys(local);

  const bundle = {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceKey,
    NEXT_PUBLIC_SITE_URL: SITE_URL,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: publicKey,
    VAPID_PRIVATE_KEY: privateKey,
    VAPID_SUBJECT,
    PWA_PUSH_ENABLED: "true",
    CRON_SECRET: cronSecret,
  };

  for (const [name, value] of Object.entries(bundle)) {
    if (!value) {
      console.error(`empty value for ${name}`);
      process.exit(1);
    }
    setVercelEnv(name, value);
  }

  await setSupabaseEdgeSecrets([
    { name: "VAPID_PUBLIC_KEY", value: publicKey },
    { name: "VAPID_PRIVATE_KEY", value: privateKey },
    { name: "VAPID_SUBJECT", value: VAPID_SUBJECT },
    { name: "PWA_PUSH_ENABLED", value: "true" },
  ]);

  const cronFile = path.join(ROOT, ".tmp-push-cron-secret");
  fs.writeFileSync(cronFile, cronSecret, { encoding: "utf8", mode: 0o600 });
  console.log(`[cron] secret written to ${cronFile} (sync vault via MCP/SQL, poi elimina file)`);

  if (process.argv.includes("--deploy-only")) {
    console.log("[vercel] production deploy only…");
    run("npx vercel deploy --prod --yes");
    return;
  }

  if (process.argv.includes("--deploy")) {
    console.log("[vercel] production deploy…");
    run("npx vercel deploy --prod --yes");
  } else {
    console.log("[done] env aggiornati. Esegui: node scripts/ops/bootstrap-pwa-push.mjs --deploy");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
