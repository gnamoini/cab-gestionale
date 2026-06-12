const stack: string[] = [];

export function getActiveCorrelationId(): string | undefined {
  return stack.length > 0 ? stack[stack.length - 1] : undefined;
}

export function setActiveCorrelationId(id: string): void {
  stack.push(id);
}

export function popActiveCorrelationId(): void {
  stack.pop();
}

export function runWithCorrelationId<T>(id: string, fn: () => T): T {
  setActiveCorrelationId(id);
  try {
    return fn();
  } finally {
    popActiveCorrelationId();
  }
}

export async function runWithCorrelationIdAsync<T>(id: string, fn: () => Promise<T>): Promise<T> {
  setActiveCorrelationId(id);
  try {
    return await fn();
  } finally {
    popActiveCorrelationId();
  }
}
