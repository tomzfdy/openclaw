import { beforeEach, describe, expect, it, vi } from "vitest";
import { findRoutedCommand } from "./routes.js";

describe("program routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function expectRoute(path: string[]) {
    const route = findRoutedCommand(path);
    expect(route).not.toBeNull();
    return route;
  }

  async function expectRunFalse(path: string[], argv: string[]) {
    const route = expectRoute(path);
    await expect(route?.run(argv)).resolves.toBe(false);
  }

  it("matches the sessions route", () => {
    const route = expectRoute(["sessions"]);
    expect(route).not.toBeNull();
  });

  it("returns false for sessions route when --store value is missing", async () => {
    await expectRunFalse(["sessions"], ["node", "openclaw", "sessions", "--store"]);
  });

  it("returns false for sessions route when --active value is missing", async () => {
    await expectRunFalse(["sessions"], ["node", "openclaw", "sessions", "--active"]);
  });

  it("returns false for sessions route when --agent value is missing", async () => {
    await expectRunFalse(["sessions"], ["node", "openclaw", "sessions", "--agent"]);
  });

  it("does not fast-route sessions subcommands", () => {
    expect(findRoutedCommand(["sessions", "cleanup"])).toBeNull();
  });

  it("does not match unknown routes", () => {
    expect(findRoutedCommand(["definitely-not-real"])).toBeNull();
  });
});
