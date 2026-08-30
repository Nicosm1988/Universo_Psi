import { describe, expect, it } from "vitest";

import { safeInternalPath } from "./origin";

describe("safeInternalPath", () => {
  it.each([
    ["/dashboard", "/dashboard"],
    ["/profesionales/sumarse?paso=2", "/profesionales/sumarse?paso=2"],
  ])("keeps same-site path %s", (input, expected) => {
    expect(safeInternalPath(input)).toBe(expected);
  });

  it.each([null, "", "https://evil.example", "//evil.example/path"])(
    "uses a safe fallback for %s",
    (input) => {
      expect(safeInternalPath(input, "/ingresar")).toBe("/ingresar");
    },
  );
});
