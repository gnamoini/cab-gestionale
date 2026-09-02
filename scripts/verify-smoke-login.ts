import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";

function loadEnvLocal(): void {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key]) continue;
    process.env[key] = trimmed.slice(eq + 1).trim();
  }
}

async function main(): Promise<void> {
  loadEnvLocal();
  const email = process.env.SMOKE_ADMIN_EMAIL?.trim();
  const password = process.env.SMOKE_ADMIN_PASSWORD?.trim();
  if (!email || !password) {
    console.error("SMOKE_ADMIN_EMAIL/PASSWORD missing");
    process.exit(1);
  }
  const { url, anonKey } = assertSupabasePublicEnv();
  const sb = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    console.error("login failed:", error.message);
    process.exit(1);
  }
  console.log("login ok:", data.user?.id, data.user?.email);
}

void main();
