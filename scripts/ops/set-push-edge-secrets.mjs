#!/usr/bin/env node
/**
 * Imposta secrets Edge Function push su Supabase (Management API).
 * Richiede: SUPABASE_ACCESS_TOKEN (PAT da dashboard.supabase.com/account/tokens)
 *
 * Uso:
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/ops/set-push-edge-secrets.mjs
 */
const projectRef = "oxmnuovsgenqkuwfolqh";
const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
  ?? process.env.VAPID_PUBLIC_KEY?.trim();
const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:service@autocompattatori.it";
const pushEnabled = process.env.PWA_PUSH_ENABLED?.trim() || "true";

if (!publicKey || !privateKey) {
  console.error("Missing VAPID keys (NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY)");
  process.exit(1);
}

const secrets = [
  { name: "VAPID_PUBLIC_KEY", value: publicKey },
  { name: "VAPID_PRIVATE_KEY", value: privateKey },
  { name: "VAPID_SUBJECT", value: subject },
  { name: "PWA_PUSH_ENABLED", value: pushEnabled },
];

const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/secrets`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(secrets),
});

if (!res.ok) {
  const text = await res.text();
  console.error(`secrets set failed ${res.status}: ${text}`);
  process.exit(1);
}

console.log("push edge secrets set:", secrets.map((s) => s.name).join(", "));
