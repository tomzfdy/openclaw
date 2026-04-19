import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getCoreCliCommandNamesMock = vi.hoisted(() => vi.fn(() => ["setup", "sessions", "tasks"]));
const registerCoreCliByNameMock = vi.hoisted(() =>
  vi.fn(async (program: Command, _ctx: unknown, name: string) => {
    program.command(name);
    return true;
  }),
);
const getProgramContextMock = vi.hoisted(() => vi.fn(() => ({ fake: true })));

vi.mock("./program/command-registry-core.js", () => ({
  getCoreCliCommandNames: getCoreCliCommandNamesMock,
  registerCoreCliByName: registerCoreCliByNameMock,
}));

vi.mock("./program/program-context.js", () => ({
  getProgramContext: getProgramContextMock,
}));

describe("completion-cli write-state", () => {
  const originalHome = process.env.HOME;
  const originalStateDir = process.env.OPENCLAW_STATE_DIR;

  beforeEach(() => {
    getCoreCliCommandNamesMock.mockClear();
    registerCoreCliByNameMock.mockClear();
    getProgramContextMock.mockClear();
  });

  afterEach(async () => {
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }
    if (originalStateDir === undefined) {
      delete process.env.OPENCLAW_STATE_DIR;
    } else {
      process.env.OPENCLAW_STATE_DIR = originalStateDir;
    }
  });

  it("writes completion cache from the reduced core command tree", async () => {
    const { registerCompletionCli } = await import("./completion-cli.js");
    const stateDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-completion-state-"));
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-completion-home-"));

    process.env.OPENCLAW_STATE_DIR = stateDir;
    process.env.HOME = homeDir;

    const program = new Command();
    program.name("openclaw");
    registerCompletionCli(program);

    await program.parseAsync(["completion", "--write-state"], { from: "user" });

    const cacheDir = path.join(stateDir, "completions");
    expect(await fs.readdir(cacheDir)).toEqual(
      expect.arrayContaining(["openclaw.bash", "openclaw.fish", "openclaw.ps1", "openclaw.zsh"]),
    );
    expect(registerCoreCliByNameMock).toHaveBeenCalledWith(program, { fake: true }, "setup");
    expect(registerCoreCliByNameMock).toHaveBeenCalledWith(program, { fake: true }, "sessions");
    expect(registerCoreCliByNameMock).toHaveBeenCalledWith(program, { fake: true }, "tasks");

    await fs.rm(stateDir, { recursive: true, force: true });
    await fs.rm(homeDir, { recursive: true, force: true });
  });
});
