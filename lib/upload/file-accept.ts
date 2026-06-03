function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

function tokenMatchesFile(token: string, file: File): boolean {
  const trimmed = token.trim().toLowerCase();
  if (!trimmed) return false;

  if (trimmed.startsWith(".")) {
    return extOf(file.name) === trimmed;
  }

  if (trimmed.endsWith("/*")) {
    const prefix = trimmed.slice(0, -1);
    return file.type.toLowerCase().startsWith(prefix);
  }

  return file.type.toLowerCase() === trimmed;
}

/** Verifica se un file rispetta l'attributo HTML accept (es. `image/*`, `.pdf`, `application/pdf`). */
export function fileMatchesAccept(file: File, accept?: string): boolean {
  if (!accept?.trim()) return true;
  return accept.split(",").some((token) => tokenMatchesFile(token, file));
}
