/**
 * Canonical JSON serializer used for on-chain proof hashing.
 *
 * Accepted types: string | number (finite) | boolean | null | array | object.
 * Rejected (throws CanonicalizeError):
 *   - undefined values (anywhere, including object properties)
 *   - NaN / Infinity / -Infinity
 *   - functions, symbols, BigInt
 *   - cyclic references
 *
 * Output is `JSON.stringify` over a key-sorted copy of the input — so it is
 * stable across runs and matches the original (pre-hardening) format for any
 * value that was already valid. This is *not* full RFC 8785 number formatting;
 * callers must use safe integers or pre-formatted strings.
 */
export class CanonicalizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CanonicalizeError";
  }
}

export function canonicalize(value: unknown): string {
  return JSON.stringify(sortValue(value, new WeakSet(), "$"));
}

function sortValue(v: unknown, seen: WeakSet<object>, path: string): unknown {
  if (v === undefined) {
    throw new CanonicalizeError(`undefined is not allowed (at ${path})`);
  }
  if (v === null) return v;

  const t = typeof v;
  if (t === "number") {
    if (!Number.isFinite(v)) {
      throw new CanonicalizeError(`non-finite number is not allowed (at ${path}): ${String(v)}`);
    }
    return v;
  }
  if (t === "string" || t === "boolean") return v;
  if (t === "function" || t === "symbol" || t === "bigint") {
    throw new CanonicalizeError(`${t} is not allowed (at ${path})`);
  }

  // Object or array
  const obj = v as object;
  if (seen.has(obj)) {
    throw new CanonicalizeError(`cyclic reference detected (at ${path})`);
  }
  seen.add(obj);

  if (Array.isArray(v)) {
    const out = v.map((item, i) => sortValue(item, seen, `${path}[${i}]`));
    seen.delete(obj);
    return out;
  }

  const out: Record<string, unknown> = {};
  for (const key of Object.keys(v as Record<string, unknown>).sort()) {
    const childPath = `${path}.${key}`;
    const child = (v as Record<string, unknown>)[key];
    out[key] = sortValue(child, seen, childPath);
  }
  seen.delete(obj);
  return out;
}

