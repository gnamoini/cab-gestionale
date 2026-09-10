export const FATTURAZIONE_WORKFLOW_ACTIONS = [
  "read",
  "create",
  "edit_draft",
  "confirm",
  "submit",
  "correct",
  "view_xml",
  "view_sdi_events",
  "emit",
  "approve",
  "cancel",
  "register_payment",
  "export",
] as const;

export type FatturazioneWorkflowAction = (typeof FATTURAZIONE_WORKFLOW_ACTIONS)[number];

export type FatturazionePermissions = {
  canRead: boolean;
  canWrite: boolean;
  canSdiAdmin: boolean;
};

export function resolveFatturazionePermissions(perms: {
  canRead?: boolean;
  canWrite?: boolean;
  canSdiAdmin?: boolean;
}): FatturazionePermissions {
  return {
    canRead: Boolean(perms.canRead),
    canWrite: Boolean(perms.canWrite),
    canSdiAdmin: Boolean(perms.canSdiAdmin),
  };
}

export function canFatturazioneWorkflowAction(
  action: FatturazioneWorkflowAction,
  perms: FatturazionePermissions,
): boolean {
  switch (action) {
    case "read":
    case "view_xml":
    case "view_sdi_events":
    case "export":
      return perms.canRead || perms.canWrite || perms.canSdiAdmin;
    case "create":
    case "edit_draft":
    case "approve":
    case "register_payment":
      return perms.canWrite;
    case "confirm":
    case "emit":
      return perms.canWrite;
    case "submit":
    case "correct":
      return perms.canWrite || perms.canSdiAdmin;
    case "cancel":
      return perms.canWrite;
    default:
      return perms.canWrite;
  }
}
