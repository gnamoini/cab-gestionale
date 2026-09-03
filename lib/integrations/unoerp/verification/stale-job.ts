export function isStaleJob(jobSourceVersion: number, lastSyncedSourceVersion: number | null): boolean {
  if (lastSyncedSourceVersion == null) return false;
  return jobSourceVersion < lastSyncedSourceVersion;
}
