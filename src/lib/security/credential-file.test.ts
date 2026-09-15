import { describe, expect, it } from "vitest";
import { credentialFileType, MAX_CREDENTIAL_BYTES } from "./credential-file";
describe("credential signatures", () => {
  it("rejects disguised HTML and truncated input", () => {
    expect(credentialFileType(new TextEncoder().encode("<html><script>alert(1)</script>"))).toBeNull();
    expect(credentialFileType(new Uint8Array([0xff, 0xd8, 0xff]))).toBeNull();
  });
  it("identifies permitted signatures", () => {
    expect(credentialFileType(new TextEncoder().encode("%PDF-1.7\n"))?.extension).toBe("pdf");
    expect(credentialFileType(new Uint8Array([137,80,78,71,13,10,26,10]))?.extension).toBe("png");
    expect(credentialFileType(new Uint8Array([255,216,255,224,0,16,74,70]))?.extension).toBe("jpg");
  });
  it("enforces the size limit even when the signature is valid", () => {
    const bytes = new Uint8Array(MAX_CREDENTIAL_BYTES + 1);
    bytes.set(new TextEncoder().encode("%PDF-1.7\n"));
    expect(credentialFileType(bytes)).toBeNull();
  });
});
