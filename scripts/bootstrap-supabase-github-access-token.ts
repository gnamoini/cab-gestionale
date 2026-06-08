/**
 * Imposta SUPABASE_ACCESS_TOKEN nei GitHub Actions secrets (repo).
 * Legge il token dalla Supabase CLI (Windows Credential Manager via keytar).
 * Uso: npx tsx scripts/bootstrap-supabase-github-access-token.ts
 */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sodium = require("tweetsodium") as { seal: (message: Buffer, publicKey: Buffer) => Uint8Array };
const keytar = require("keytar") as {
  findCredentials: (service: string) => Promise<Array<{ account: string; password: string }>>;
};

const REPO = "gnamoini/cab-gestionale";
const SECRET_NAME = "SUPABASE_ACCESS_TOKEN";

function gitHubToken(): string {
  const fromEnv = process.env.GH_TOKEN?.trim() || process.env.GITHUB_TOKEN?.trim();
  if (fromEnv) return fromEnv;

  const filled = execSync(
    `powershell -NoProfile -Command "$input = @('protocol=https','host=github.com',''); $input | git credential fill"`,
    { encoding: "utf8" },
  );
  const m = filled.match(/^password=(.+)$/m);
  if (!m?.[1]) throw new Error("GH_TOKEN assente e git credential fill fallito");
  return m[1].trim();
}

async function supabaseAccessToken(): Promise<string> {
  const fromEnv = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (fromEnv) return fromEnv;

  const creds = await keytar.findCredentials("Supabase CLI");
  const token = creds.find((c) => c.account === "supabase")?.password?.trim();
  if (!token) {
    throw new Error(
      "SUPABASE_ACCESS_TOKEN non trovato: eseguire `npx supabase login` oppure impostare SUPABASE_ACCESS_TOKEN",
    );
  }
  return token;
}

async function main(): Promise<void> {
  const ghToken = gitHubToken();
  const accessToken = await supabaseAccessToken();

  const pkRes = await fetch(`https://api.github.com/repos/${REPO}/actions/secrets/public-key`, {
    headers: {
      Authorization: `Bearer ${ghToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!pkRes.ok) throw new Error(`public-key HTTP ${pkRes.status}: ${await pkRes.text()}`);
  const { key_id, key } = (await pkRes.json()) as { key_id: string; key: string };

  const encryptedBytes = sodium.seal(Buffer.from(accessToken, "utf8"), Buffer.from(key, "base64"));
  const setRes = await fetch(`https://api.github.com/repos/${REPO}/actions/secrets/${SECRET_NAME}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${ghToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      encrypted_value: Buffer.from(encryptedBytes).toString("base64"),
      key_id,
    }),
  });
  if (!setRes.ok && setRes.status !== 201 && setRes.status !== 204) {
    throw new Error(`set ${SECRET_NAME} HTTP ${setRes.status}: ${await setRes.text()}`);
  }

  const sha8 = createHash("sha256").update(accessToken).digest("hex").slice(0, 8);
  console.log(`[bootstrap] OK ${SECRET_NAME} (len=${accessToken.length} sha8=${sha8})`);
}

void main().catch((err) => {
  console.error("[bootstrap]", err instanceof Error ? err.message : err);
  process.exit(1);
});
