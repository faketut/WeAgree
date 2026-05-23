import { safeRelativePath } from "./safeRedirect";

describe("safeRelativePath", () => {
  it("returns default when input is empty or null", () => {
    expect(safeRelativePath(null)).toBe("/dashboard");
    expect(safeRelativePath(undefined)).toBe("/dashboard");
    expect(safeRelativePath("")).toBe("/dashboard");
    expect(safeRelativePath("   ")).toBe("/dashboard");
  });

  it("accepts simple relative paths", () => {
    expect(safeRelativePath("/dashboard")).toBe("/dashboard");
    expect(safeRelativePath("/sign/abc-123")).toBe("/sign/abc-123");
    expect(safeRelativePath("/settings/passkeys")).toBe("/settings/passkeys");
  });

  it("rejects protocol-relative URLs", () => {
    expect(safeRelativePath("//evil.com")).toBe("/dashboard");
    expect(safeRelativePath("///x")).toBe("/dashboard");
    expect(safeRelativePath("//evil.com/path")).toBe("/dashboard");
  });

  it("rejects encoded protocol-relative URLs", () => {
    expect(safeRelativePath("/%2F%2Fevil.com")).toBe("/dashboard");
  });

  it("rejects backslash tricks", () => {
    expect(safeRelativePath("/\\evil.com")).toBe("/dashboard");
    expect(safeRelativePath("/path\\to")).toBe("/dashboard");
  });

  it("rejects absolute URLs", () => {
    expect(safeRelativePath("https://evil.com")).toBe("/dashboard");
    expect(safeRelativePath("http://evil.com")).toBe("/dashboard");
    expect(safeRelativePath("javascript:alert(1)")).toBe("/dashboard");
  });

  it("rejects @ to prevent credential injection", () => {
    expect(safeRelativePath("/user@evil.com")).toBe("/dashboard");
  });

  it("honours a custom fallback", () => {
    expect(safeRelativePath(null, "/login")).toBe("/login");
  });
});
