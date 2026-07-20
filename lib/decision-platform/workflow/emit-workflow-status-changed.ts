import {
  createDomainEventV1,
  WORKFLOW_STATUS_CHANGED,
  type WorkflowStatusChangedPayload,
} from "@/lib/decision-platform/types/events";

export function emitWorkflowStatusChanged(
  payload: WorkflowStatusChangedPayload,
  correlationId: string,
  causationId?: string,
) {
  return createDomainEventV1(WORKFLOW_STATUS_CHANGED, payload, correlationId, causationId);
}
