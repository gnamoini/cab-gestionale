import { spawnSync } from "node:child_process";

function run(label: string, cmd: string, args: string[], env?: NodeJS.ProcessEnv): boolean {
  console.log(`\n--- ${label} ---\n`);
  const r = spawnSync(cmd, args, { shell: true, stdio: "inherit", env: { ...process.env, ...env } });
  return r.status === 0;
}

function smokeCredsPresent(): boolean {
  return Boolean(
    process.env.SMOKE_ADMIN_EMAIL?.trim() &&
      process.env.SMOKE_ADMIN_PASSWORD?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

function main(): void {
  if (!run("smoke:structural", "npm", ["run", "smoke:structural"])) process.exit(1);
  if (!run("smoke:regression", "npm", ["run", "smoke:regression"])) process.exit(1);

  if (process.env.SMOKE_SKIP === "1") {
    console.log("\nSMOKE_SKIP=1 — playwright smoke skipped (PASS advisory)\n");
    process.exit(0);
  }

  if (!smokeCredsPresent()) {
    console.log("\nSmoke Playwright skipped: set SMOKE_ADMIN_EMAIL/PASSWORD + Supabase public env (or SMOKE_SKIP=1)\n");
    process.exit(0);
  }

  if (!run("smoke:playwright", "npm", ["run", "smoke:playwright"])) process.exit(1);
  process.exit(0);
}

main();
