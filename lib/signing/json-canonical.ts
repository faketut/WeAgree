export function canonicalize(value: unknown): string {
  return JSON.stringify(sortValue(value as any));
}

function sortValue(v: any): any {
  if (v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map(sortValue);

  const out: Record<string, any> = {};
  for (const key of Object.keys(v).sort()) {
    out[key] = sortValue(v[key]);
  }
  return out;
}

