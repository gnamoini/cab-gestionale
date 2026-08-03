/** SSOT idempotency keys — entity-based, obbligatorie per outbox e dispatch. */

export function entityDispatchIdempotencyKey(
  notificationEventId: string,
  entityType: string,
  entityId: string,
  version?: string,
): string {
  const base = `${notificationEventId}:${entityType}:${entityId}`;
  return version?.trim() ? `${base}:${version.trim()}` : base;
}

export function entityOutboxIdempotencyKey(
  notificationEventId: string,
  entityType: string,
  entityId: string,
  version?: string,
): string {
  return entityDispatchIdempotencyKey(notificationEventId, entityType, entityId, version);
}
