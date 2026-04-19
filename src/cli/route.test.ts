import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const emitCliBannerMock = vi.hoisted(() => vi.fn());
const ensureConfigReadyMock = vi.hoisted(() => vi.fn(async () => {}));
const findRoutedCommandMock = vi.hoisted(() => vi.fn());
const runRouteMock = vi.hoisted(() => vi.fn(async () => true));

vi.mock("./banner.js", () => ({
  emitCliBanner: emitCliBannerMock,
}));

vi.mock("./program/config-guard.js", () => ({
  ensureConfigReady: ensureConfigReadyMock,
}));

vi.mock("./program/routes.js", () => ({
  findRoutedCommand: findRoutedCommandMock,
}));

vi.mock("../runtime.js", () => ({
  defaultRuntime: {
    error: vi.fn(),
    log: vi.fn(),
    exit: vi.fn(),
    writeStdout: vi.fn(),
    writeJson: vi.fn(),
  },
}));

describe("tryRouteCli", () => {
  let tryRouteCli: typeof import("./route.js").tryRouteCli;
  // After vi.resetModules(), reimported modules get fresh loggingState.
  // Capture the same reference that route.js uses.
  let loggingState: typeof import("../logging/state.js").loggingState;
  let originalDisableRouteFirst: string | undefined;
  let originalHideBanner: string | undefined;
  let originalForceStderr: boolean;

  beforeAll(async () => {
    ({ tryRouteCli } = await import("./route.js"));
    ({ loggingState } = await import("../logging/state.js"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    originalDisableRouteFirst = process.env.OPENCLAW_DISABLE_ROUTE_FIRST;
    originalHideBanner = process.env.OPENCLAW_HIDE_BANNER;
    delete process.env.OPENCLAW_DISABLE_ROUTE_FIRST;
    delete process.env.OPENCLAW_HIDE_BANNER;
    originalForceStderr = loggingState.forceConsoleToStderr;
    loggingState.forceConsoleToStderr = false;
    findRoutedCommandMock.mockReturnValue({
      run: runRouteMock,
    });
  });

  afterEach(() => {
    if (loggingState) {
      loggingState.forceConsoleToStderr = originalForceStderr;
    }
    if (originalDisableRouteFirst === undefined) {
      delete process.env.OPENCLAW_DISABLE_ROUTE_FIRST;
    } else {
      process.env.OPENCLAW_DISABLE_ROUTE_FIRST = originalDisableRouteFirst;
    }
    if (originalHideBanner === undefined) {
      delete process.env.OPENCLAW_HIDE_BANNER;
    } else {
      process.env.OPENCLAW_HIDE_BANNER = originalHideBanner;
    }
  });

  it("routes minimal sessions --json commands with suppressed bootstrap output", async () => {
    await expect(tryRouteCli(["node", "openclaw", "sessions", "--json"])).resolves.toBe(true);

    expect(ensureConfigReadyMock).toHaveBeenCalledWith({
      runtime: expect.any(Object),
      commandPath: ["sessions"],
      suppressDoctorStdout: true,
    });
  });

  it("runs config bootstrap for routed non-json commands", async () => {
    await expect(tryRouteCli(["node", "openclaw", "sessions"])).resolves.toBe(true);

    expect(ensureConfigReadyMock).toHaveBeenCalledWith({
      runtime: expect.any(Object),
      commandPath: ["sessions"],
    });
  });

  it("routes sessions when root options precede the command", async () => {
    await expect(tryRouteCli(["node", "openclaw", "--log-level", "debug", "sessions"])).resolves.toBe(
      true,
    );

    expect(findRoutedCommandMock).toHaveBeenCalledWith(["sessions"]);
    expect(ensureConfigReadyMock).toHaveBeenCalledWith({
      runtime: expect.any(Object),
      commandPath: ["sessions"],
    });
  });

  it("respects OPENCLAW_HIDE_BANNER for routed commands", async () => {
    process.env.OPENCLAW_HIDE_BANNER = "1";

    await expect(tryRouteCli(["node", "openclaw", "sessions"])).resolves.toBe(true);

    expect(emitCliBannerMock).not.toHaveBeenCalled();
  });
});
