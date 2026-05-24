import { canonicalize, CanonicalizeError } from "./json-canonical";

describe("json-canonical", () => {
  it("sorts keys of a simple object", () => {
    const input = { b: 2, a: 1 };
    expect(canonicalize(input)).toBe('{"a":1,"b":2}');
  });

  it("sorts nested objects", () => {
    const input = {
      z: { b: 2, a: 1 },
      m: 3,
    };
    expect(canonicalize(input)).toBe('{"m":3,"z":{"a":1,"b":2}}');
  });

  it("handles arrays correctly without sorting them", () => {
    const input = { a: [3, 2, 1], b: 2 };
    expect(canonicalize(input)).toBe('{"a":[3,2,1],"b":2}');
  });

  it("handles null and primitives", () => {
    expect(canonicalize(null)).toBe("null");
    expect(canonicalize(123)).toBe("123");
    expect(canonicalize("hello")).toBe('"hello"');
  });

  it("handles nested objects in arrays", () => {
    const input = [{ b: 2, a: 1 }];
    expect(canonicalize(input)).toBe('[{"a":1,"b":2}]');
  });

  it("rejects undefined values", () => {
    expect(() => canonicalize(undefined)).toThrow(CanonicalizeError);
    expect(() => canonicalize({ a: undefined })).toThrow(CanonicalizeError);
    expect(() => canonicalize([1, undefined, 3])).toThrow(CanonicalizeError);
  });

  it("rejects NaN and Infinity", () => {
    expect(() => canonicalize(NaN)).toThrow(CanonicalizeError);
    expect(() => canonicalize(Infinity)).toThrow(CanonicalizeError);
    expect(() => canonicalize(-Infinity)).toThrow(CanonicalizeError);
    expect(() => canonicalize({ x: NaN })).toThrow(CanonicalizeError);
  });

  it("rejects cycles", () => {
    const a: Record<string, unknown> = { name: "a" };
    a.self = a;
    expect(() => canonicalize(a)).toThrow(/cyclic/);
  });

  it("rejects bigint and function values", () => {
    expect(() => canonicalize(BigInt(1))).toThrow(CanonicalizeError);
    expect(() => canonicalize({ fn: () => 1 })).toThrow(CanonicalizeError);
  });
});
