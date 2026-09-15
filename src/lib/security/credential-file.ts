export const MAX_CREDENTIAL_BYTES = 4 * 1024 * 1024;

/** Signature checks reject obvious disguised files; they are not antivirus or PDF sanitization. */
export function credentialFileType(bytes: Uint8Array): { mime: string; extension: string } | null {
  if (bytes.length < 8 || bytes.length > MAX_CREDENTIAL_BYTES) return null;
  if ([0x25, 0x50, 0x44, 0x46, 0x2d].every((byte, i) => bytes[i] === byte)) {
    return { mime: "application/pdf", extension: "pdf" };
  }
  if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, i) => bytes[i] === byte)) {
    return { mime: "image/png", extension: "png" };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", extension: "jpg" };
  }
  return null;
}
