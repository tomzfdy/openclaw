import { beforeEach, describe, expect, it, vi } from "vitest";

const ensureConfigReadyMock = vi.hoisted(() => vi.fn(async () => {}));

vi.mock("./program/config-guard.js", () => ({
  ensureConfigReady: ensureConfigReadyMock,
}));

describe("ensureCliCommandBootstrap", () => {
  let ensureCliCommandBootstrap: typeof import("./command-bootstrap.js").ensureCliCommandBootstrap;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    ({ ensureCliCommandBootstrap } = await import("./command-bootstrap.js"));
  });

  it("runs config guard with shared options", async () => {
    const runtime = {} as never;

    await ensureCliCommandBootstrap({
      runtime,
      commandPath: ["agents", "list"],
      suppressDoctorStdout: true,
      allowInvalid: true,
    });

    expect(ensureConfigReadyMock).toHaveBeenCalledWith({
      runtime,
      commandPath: ["agents", "list"],
      allowInvalid: true,
      suppressDoctorStdout: true,
    });
  });

  it("skips config guard when requested", async () => {
    await ensureCliCommandBootstrap({
      runtime: {} as never,
      commandPath: ["status"],
      suppressDoctorStdout: true,
      skipConfigGuard: true,
    });

    expect(ensureConfigReadyMock).not.toHaveBeenCalled();
  });
});
