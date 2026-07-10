export type ControlDomain =
  | "security"
  | "data"
  | "design"
  | "domain"
  | "runtime"
  | "governance";

export type ControlExecution = "ci" | "runtime" | "db";

export type ControlTier =
  | "local"
  | "pr"
  | "staging"
  | "cert"
  | "production"
  | "observe";

export type ControlSeverity = "blocker" | "warning" | "info";

export type ControlStatus =
  | "active"
  | "experimental"
  | "deprecated"
  | "sunset"
  | "disabled";

export type ControlOwner =
  | "platform"
  | "security"
  | "frontend"
  | "backend"
  | "database"
  | "devops"
  | "domain-owner";

export type ImplementationType = "npm" | "script" | "test-suite" | "runtime" | "manual";

export type RuntimeCategory = "correctness" | "reliability" | "performance";

export type ImpactArea =
  | "all-users"
  | "tenant-isolation"
  | "customer-data"
  | "billing"
  | "operations"
  | "compliance-audit"
  | "developer-experience";

export type ControlOutcome =
  | "pass"
  | "fail"
  | "warning"
  | "skipped"
  | "unknown"
  | "blocked";

export type ImplementationRef = {
  type: ImplementationType;
  reference: string;
};

export type ControlDefinition = {
  id: string;
  implementation: ImplementationRef;
  domain: ControlDomain;
  tier: ControlTier;
  severity: ControlSeverity;
  status: ControlStatus;
  owner: ControlOwner;
  sourceOfTruth: string;
  impact: ImpactArea[];
  dependsOn?: string[];
  runtimeCategory?: RuntimeCategory;
  sunsetDate?: string;
};

export type ControlExecutionContext = {
  runId: string;
  commitSha: string;
  tier: ControlTier;
  attempt: number;
  timestamp: string;
};

export type ControlResult = {
  runId: string;
  attempt: number;
  controlId: string;
  outcome: ControlOutcome;
  durationMs: number;
  reason?: string;
  blockers?: string[];
  warnings?: string[];
};

export type ControlMode = {
  schemaVersion: string;
  shadow: "advisory" | "strict";
  coverage: "warning" | "strict";
  trigger: "default" | "label" | "repository-policy";
  strictLabelApproved: boolean;
  strictLabelAppliedBy?: string;
  strictCurrentActor?: string;
  reason?: string;
};

export type ControlReport = {
  controlContractVersion: string;
  controlRegistryVersion: string;
  context: ControlExecutionContext;
  tier: ControlTier;
  controlMode: ControlMode;
  results: ControlResult[];
  summary: {
    pass: number;
    fail: number;
    warning: number;
    skipped: number;
    unknown: number;
    blocked: number;
  };
  blockers: number;
};
