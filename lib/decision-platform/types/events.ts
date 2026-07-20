export const WORKFLOW_STATUS_CHANGED = "workflow.status_changed" as const;

export type WorkflowStatusChangedPayload = {
  workflowId: string;
  previousStatus: string;
  newStatus: string;
  changedAt: string;
  actorId?: string;
};

export type DomainEventV1<TPayload> = {
  type: string;
  version: 1;
  payload: TPayload;
  correlationId: string;
  causationId?: string;
  occurredAt: string;
};

export function createDomainEventV1<TPayload>(
  type: string,
  payload: TPayload,
  correlationId: string,
  causationId?: string,
): DomainEventV1<TPayload> {
  return {
    type,
    version: 1,
    payload,
    correlationId,
    causationId,
    occurredAt: new Date().toISOString(),
  };
}
