import { describe, expect, it } from "vitest";
import { parseSiteControls } from "./site-controls";
describe("site controls", () => {
  it("does not turn strings or missing flags into enabled controls", () => {
    expect(parseSiteControls({ ads: "false", feedback: true, matchmaking: true })).toBeNull();
    expect(parseSiteControls(null)).toBeNull();
    expect(parseSiteControls({})).toBeNull();
  });
  it("preserves explicit false switches", () => {
    expect(parseSiteControls({ ads: false, feedback: false, matchmaking: false })).toEqual({ ads: false, feedback: false, matchmaking: false });
  });
});
