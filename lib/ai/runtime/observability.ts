import "server-only";

type AiObsEvent =
  | "AI_REQUEST"
  | "AI_RESPONSE"
  | "AI_FAILURE"
  | "AI_FAILOVER"
  | "AI_CONFIG_CHECK";

export function logAiObs(
  event: AiObsEvent,
  payload: Record<string, string | number | boolean | null | undefined>,
): void {
  console.info(
    JSON.stringify({
      event,
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? null,
      vercelEnv: process.env.VERCEL_ENV ?? null,
      commitSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      runtime: "nodejs",
      ...payload,
    }),
  );
}
