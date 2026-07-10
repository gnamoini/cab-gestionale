import type { ControlOwner } from "./types";

export const CONTROL_OWNERS: Record<
  ControlOwner,
  { name: string; team: string; contact?: string }
> = {
  platform: { name: "Platform", team: "platform" },
  security: { name: "Security", team: "security" },
  frontend: { name: "Frontend", team: "frontend" },
  backend: { name: "Backend", team: "backend" },
  database: { name: "Database", team: "database" },
  devops: { name: "DevOps", team: "devops" },
  "domain-owner": { name: "Domain Owner", team: "product" },
};

export function isControlOwner(value: string): value is ControlOwner {
  return value in CONTROL_OWNERS;
}
