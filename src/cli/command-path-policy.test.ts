import { describe, expect, it } from "vitest";
import { resolveCliCommandPathPolicy } from "./command-path-policy.js";

describe("command-path-policy", () => {
  it("resolves the default minimal policy", () => {
    expect(resolveCliCommandPathPolicy(["sessions"])).toEqual({
      bypassConfigGuard: false,
      routeConfigGuard: "never",
      hideBanner: false,
      ensureCliPath: false,
    });
  });

  it("resolves startup-only overrides that still exist", () => {
    expect(resolveCliCommandPathPolicy(["dashboard"])).toEqual({
      bypassConfigGuard: false,
      routeConfigGuard: "never",
      hideBanner: false,
      ensureCliPath: true,
    });
    expect(resolveCliCommandPathPolicy(["completion"])).toEqual({
      bypassConfigGuard: true,
      routeConfigGuard: "never",
      hideBanner: true,
      ensureCliPath: true,
    });
  });
});
