import { describe, expect, it } from "vitest";
import {
  resolveCliStartupPolicy,
  shouldBypassConfigGuardForCommandPath,
  shouldEnsureCliPathForCommandPath,
  shouldHideCliBannerForCommandPath,
  shouldSkipRouteConfigGuardForCommandPath,
} from "./command-startup-policy.js";

describe("command-startup-policy", () => {
  it("matches config guard bypass commands", () => {
    expect(shouldBypassConfigGuardForCommandPath(["completion"])).toBe(true);
    expect(shouldBypassConfigGuardForCommandPath(["sessions"])).toBe(false);
    expect(shouldBypassConfigGuardForCommandPath(["dashboard"])).toBe(false);
  });

  it("matches route-first config guard skip policy", () => {
    expect(
      shouldSkipRouteConfigGuardForCommandPath({
        commandPath: ["sessions"],
        suppressDoctorStdout: true,
      }),
    ).toBe(false);
    expect(
      shouldSkipRouteConfigGuardForCommandPath({
        commandPath: ["sessions"],
        suppressDoctorStdout: false,
      }),
    ).toBe(false);
    expect(
      shouldSkipRouteConfigGuardForCommandPath({
        commandPath: ["completion"],
        suppressDoctorStdout: false,
      }),
    ).toBe(false);
  });

  it("matches banner suppression policy", () => {
    expect(shouldHideCliBannerForCommandPath(["completion"])).toBe(true);
    expect(
      shouldHideCliBannerForCommandPath(["sessions"], {
        ...process.env,
        OPENCLAW_HIDE_BANNER: "1",
      }),
    ).toBe(true);
    expect(shouldHideCliBannerForCommandPath(["sessions"], {})).toBe(false);
  });

  it("matches CLI PATH bootstrap policy", () => {
    expect(shouldEnsureCliPathForCommandPath(["sessions"])).toBe(false);
    expect(shouldEnsureCliPathForCommandPath(["dashboard"])).toBe(true);
    expect(shouldEnsureCliPathForCommandPath(["completion"])).toBe(true);
    expect(shouldEnsureCliPathForCommandPath([])).toBe(true);
  });

  it("aggregates startup policy for commander and route-first callers", () => {
    expect(
      resolveCliStartupPolicy({
        commandPath: ["sessions"],
        jsonOutputMode: true,
      }),
    ).toEqual({
      suppressDoctorStdout: true,
      hideBanner: false,
      skipConfigGuard: false,
    });

    expect(
      resolveCliStartupPolicy({
        commandPath: ["sessions"],
        jsonOutputMode: true,
        routeMode: true,
      }),
    ).toEqual({
      suppressDoctorStdout: true,
      hideBanner: false,
      skipConfigGuard: false,
    });
  });
});
