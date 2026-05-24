import { validateSignatureDisplay, MAX_SIGNATURE_DATA_URI_BYTES } from "./signature-validation";

describe("validateSignatureDisplay", () => {
  it("rejects empty / non-string", () => {
    expect(validateSignatureDisplay("")).toEqual({ ok: false, error: "Signature is required." });
    // @ts-expect-error testing runtime guard
    expect(validateSignatureDisplay(null)).toEqual({ ok: false, error: "Signature is required." });
  });

  it("accepts a short typed signature", () => {
    expect(validateSignatureDisplay("Jane Doe")).toEqual({ ok: true });
  });

  it("rejects oversized typed signatures", () => {
    expect(validateSignatureDisplay("a".repeat(4097))).toEqual({
      ok: false,
      error: "Signature text is too long.",
    });
  });

  it("accepts PNG and JPG data URIs", () => {
    expect(validateSignatureDisplay("data:image/png;base64,iVBORw0K")).toEqual({ ok: true });
    expect(validateSignatureDisplay("data:image/jpeg;base64,/9j/4AAQ")).toEqual({ ok: true });
  });

  it("rejects other data URI types", () => {
    expect(validateSignatureDisplay("data:image/svg+xml;base64,PHN2Zw==")).toEqual({
      ok: false,
      error: "Only PNG or JPG signature images are accepted.",
    });
    expect(validateSignatureDisplay("data:text/html;base64,PGgxPg==")).toEqual({
      ok: false,
      error: "Only PNG or JPG signature images are accepted.",
    });
  });

  it("rejects oversized data URIs", () => {
    const huge = "data:image/png;base64," + "A".repeat(MAX_SIGNATURE_DATA_URI_BYTES);
    expect(validateSignatureDisplay(huge)).toEqual({
      ok: false,
      error: "Signature image exceeds the 1 MB limit.",
    });
  });
});
