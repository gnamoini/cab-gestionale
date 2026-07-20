export type ConfidenceLevel = "high" | "medium" | "low";

export type EvidenceRef =
  | { kind: "metric"; metricId: string; value: number | string }
  | { kind: "diary"; entryId: string; excerpt: string }
  | { kind: "insight"; ruleKey: string; payload: Record<string, unknown> }
  | {
      kind: "delta";
      metricId: string;
      current: number;
      previous: number;
      deltaPct: number;
    };

export type EvidencedStatement = {
  statement: string;
  confidence: ConfidenceLevel;
  evidence: EvidenceRef[];
};

export type OperationalDiaryCategory =
  | "issue"
  | "customer"
  | "machine"
  | "supplier"
  | "staff"
  | "improvement"
  | "warning";

export type OperationalDiaryEntry = {
  id?: string;
  workDate: string;
  text: string;
  category: OperationalDiaryCategory;
  severity: "low" | "medium" | "high";
  relatedEntity?: { type: string; id: string };
  source: "user" | "system";
};

export type OperationalBriefScoreStatus = "green" | "amber" | "red";

export type DomainTrend = "up" | "down" | "flat";

export type OperationalBriefScore = {
  overall: number;
  status: OperationalBriefScoreStatus;
  domains: {
    production: { score: number; trend: DomainTrend };
    reliability: { score: number; trend: DomainTrend };
    warehouse: { score: number; trend: DomainTrend };
    staff: { score: number; trend: DomainTrend };
    costs: { score: number; trend: DomainTrend };
  };
  reasons: string[];
};

export type OperationalEventType = "anomaly" | "improvement" | "risk" | "opportunity";

export type OperationalEvent = {
  id: string;
  type: OperationalEventType;
  impact: "low" | "medium" | "high";
  source: "automatic" | "diary" | "user";
  headline: string;
  metricIds?: string[];
  evidence: EvidenceRef[];
  confidence: ConfidenceLevel;
};

export type DomainBrief = {
  summary: string;
  trend: DomainTrend;
  confidence: ConfidenceLevel;
  evidence: EvidenceRef[];
};

export type OperationalBriefOutput = {
  contractVersion: "1";
  period: import("@/lib/operational-intelligence/period/types").OperationalPeriod;
  briefScore: OperationalBriefScore;
  executiveSummary: {
    status: "good" | "attention" | "critical";
    headline: string;
    explanation: string;
    confidence: ConfidenceLevel;
    evidence: EvidenceRef[];
  };
  todayPriorities: EvidencedStatement[];
  topProblems: EvidencedStatement[];
  wins: EvidencedStatement[];
  events: OperationalEvent[];
  recommendedActions: {
    priority: "alta" | "media" | "bassa";
    problem: string;
    impact: string;
    action: string;
    suggestedBy: string;
    confidence: ConfidenceLevel;
    evidence: EvidenceRef[];
  }[];
  domainAnalysis: {
    production: DomainBrief;
    fleet: DomainBrief;
    warehouse: DomainBrief;
    staff: DomainBrief;
    costs: DomainBrief;
  };
  qualitativeContextUsed: OperationalDiaryEntry[];
  disclaimer: string;
  generatedAt: string;
  modelMetadata: { model: string; promptVersion: string; inputHash: string };
};
