export function createEdgeCorrelationId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `edge_${ts}_${rand}`;
}

export function resolveCorrelationId(request: Request): string {
  const incoming = request.headers.get("X-Correlation-Id")?.trim();
  return incoming || createEdgeCorrelationId();
}
