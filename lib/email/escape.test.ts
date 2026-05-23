import { escapeHtml, safeHttpUrl } from "./escape";

describe("escapeHtml", () => {
  it("returns empty for null/undefined/empty", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml("")).toBe("");
  });

  it("escapes the five HTML metacharacters", () => {
    expect(escapeHtml(`</a><script>alert("x")</script>`)).toBe(
      "&lt;/a&gt;&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
    );
    expect(escapeHtml("a&b")).toBe("a&amp;b");
    expect(escapeHtml("'quote'")).toBe("&#39;quote&#39;");
  });

  it("does not double-escape", () => {
    expect(escapeHtml("&amp;")).toBe("&amp;amp;");
  });
});

describe("safeHttpUrl", () => {
  it("returns null for non-http(s) schemes", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,foo")).toBeNull();
    expect(safeHttpUrl("file:///etc/passwd")).toBeNull();
    expect(safeHttpUrl("/relative")).toBeNull();
    expect(safeHttpUrl(null)).toBeNull();
    expect(safeHttpUrl("")).toBeNull();
  });

  it("returns http and https URLs", () => {
    expect(safeHttpUrl("https://example.com/x")).toBe("https://example.com/x");
    expect(safeHttpUrl("HTTP://example.com")).toBe("HTTP://example.com");
  });

  it("returns null for malformed URLs", () => {
    expect(safeHttpUrl("https://")).toBeNull();
  });
});
