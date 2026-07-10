#!/usr/bin/env npx tsx
/**
 * Validate control-plane-strict label — dual permission + fork guard.
 * Writes strict-label-validation.json and sets CONTROL_*_STRICT via GITHUB_ENV.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { isMaintainPlus, type StrictLabelValidation } from "@/lib/control/control-mode";

const STRICT_LABEL = "control-plane-strict";
const OUT = process.env.STRICT_LABEL_VALIDATION_PATH ?? "strict-label-validation.json";

type PullRequestEvent = {
  action?: string;
  pull_request?: {
    number: number;
    labels?: { name: string }[];
    head?: { repo?: { full_name?: string } };
    base?: { repo?: { full_name?: string } };
  };
  sender?: { login?: string };
};

function ghApi<T>(endpoint: string): T | undefined {
  const result = spawnSync("gh", ["api", endpoint], { encoding: "utf8", shell: true });
  if (result.status !== 0) return undefined;
  try {
    return JSON.parse(result.stdout) as T;
  } catch {
    return undefined;
  }
}

function collaboratorPermission(slug: string, username: string): string | undefined {
  const data = ghApi<{ permission: string }>(`repos/${slug}/collaborators/${username}/permission`);
  return data?.permission;
}

function labelAppliedBy(slug: string, prNumber: number): string | undefined {
  const events = ghApi<{ event: string; label?: { name: string }; actor?: { login: string } }[]>(
    `repos/${slug}/issues/${prNumber}/events`,
  );
  if (!Array.isArray(events)) return undefined;
  const labeled = events
    .filter((e) => e.event === "labeled" && e.label?.name === STRICT_LABEL)
    .reverse();
  return labeled[0]?.actor?.login;
}

function appendGithubEnv(key: string, value: string): void {
  const envFile = process.env.GITHUB_ENV;
  if (envFile) fs.appendFileSync(envFile, `${key}=${value}\n`);
}

function main(): void {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  let event: PullRequestEvent = {};
  if (eventPath && fs.existsSync(eventPath)) {
    event = JSON.parse(fs.readFileSync(eventPath, "utf8")) as PullRequestEvent;
  }

  const pr = event.pull_request;
  const labelPresent = (pr?.labels ?? []).some((l) => l.name === STRICT_LABEL);
  const fork =
    Boolean(pr?.head?.repo?.full_name && pr?.base?.repo?.full_name) &&
    pr!.head!.repo!.full_name !== pr!.base!.repo!.full_name;

  const slug = process.env.GITHUB_REPOSITORY ?? "";
  const currentActor = process.env.GITHUB_ACTOR ?? event.sender?.login ?? "local";
  const currentActorPermission = slug ? collaboratorPermission(slug, currentActor) : undefined;

  let labelAppliedByUser: string | undefined;
  let labelAppliedByPermission: string | undefined;
  if (slug && pr?.number && labelPresent) {
    labelAppliedByUser = labelAppliedBy(slug, pr.number);
    if (labelAppliedByUser) {
      labelAppliedByPermission = collaboratorPermission(slug, labelAppliedByUser);
    }
  }

  let approved = false;
  let reason = "default advisory";

  if (!labelPresent) {
    reason = "missing label control-plane-strict";
  } else if (fork) {
    reason = "fork PR — strict disabled";
  } else if (!isMaintainPlus(labelAppliedByPermission)) {
    reason = `label applied by ${labelAppliedByUser ?? "?"} without maintain+ permission`;
  } else if (!isMaintainPlus(currentActorPermission)) {
    reason = `current actor ${currentActor} without maintain+ permission`;
  } else {
    approved = true;
    reason = "PR label control-plane-strict validated";
  }

  const validation: StrictLabelValidation = {
    approved,
    strictEnabled: approved,
    labelPresent,
    fork,
    labelAppliedBy: labelAppliedByUser,
    labelAppliedByPermission: labelAppliedByPermission,
    currentActor,
    currentActorPermission,
    reason,
  };

  const outAbs = path.isAbsolute(OUT) ? OUT : path.join(process.cwd(), OUT);
  fs.writeFileSync(outAbs, `${JSON.stringify(validation, null, 2)}\n`);

  const strictVal = approved ? "1" : "0";
  appendGithubEnv("CONTROL_SHADOW_STRICT", strictVal);
  appendGithubEnv("CONTROL_COVERAGE_STRICT", strictVal);

  console.log(`strict enabled: ${approved}`);
  if (labelAppliedByUser) console.log(`label applied by: ${labelAppliedByUser} (${labelAppliedByPermission ?? "?"})`);
  console.log(`current actor: ${currentActor} (${currentActorPermission ?? "?"})`);
  console.log(`fork: ${fork}`);
  console.log(`approved: ${approved}`);
  console.log(`reason: ${reason}`);
  console.log(`Wrote ${OUT}`);
}

main();
