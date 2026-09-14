import { describe, expect, it } from "vitest";
import { directoryReturnUrl } from "./directory-navigation";

describe("directory return navigation", () => {
  it("preserves repeated filters and the selected result", () => {
    expect(directoryReturnUrl("/profesionales?need=ansiedad&need=duelo&type=psicologia#professional-123"))
      .toBe("/profesionales?need=ansiedad&need=duelo&type=psicologia#professional-123");
  });
  it.each(["https://evil.test/profesionales", "//evil.test/profesionales", "javascript:alert(1)", "/dashboard", "/profesionales/otra-persona"])("rejects unrelated destination %s", (value) => {
    expect(directoryReturnUrl(value)).toBe("/profesionales");
  });
  it("drops unrelated parameters and anchors", () => {
    expect(directoryReturnUrl("/profesionales?token=private&type=psicologia#arbitrary")).toBe("/profesionales?type=psicologia");
  });
});
