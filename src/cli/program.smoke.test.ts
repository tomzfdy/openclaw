import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildProgram } from "./program/build-program.js";
import {
  ensureConfigReady,
  installBaseProgramMocks,
  installSmokeProgramMocks,
  setupCommand,
  setupWizardCommand,
} from "./program.test-mocks.js";

installBaseProgramMocks();
installSmokeProgramMocks();

describe("cli program (smoke)", () => {
  let program = createProgram();

  function createProgram() {
    return buildProgram();
  }

  async function runProgram(argv: string[]) {
    await program.parseAsync(argv, { from: "user" });
  }

  beforeEach(() => {
    program = createProgram();
    vi.clearAllMocks();
    ensureConfigReady.mockResolvedValue(undefined);
  });

  it("registers only the reduced command surface", () => {
    const names = program.commands.map((command) => command.name());
    expect(names).toEqual([
      "setup",
      "dashboard",
      "reset",
      "uninstall",
      "sessions",
      "tasks",
      "completion",
    ]);
  });

  it("runs setup wizard when wizard flags are present", async () => {
    await runProgram(["setup", "--remote-url", "ws://example"]);

    expect(setupCommand).not.toHaveBeenCalled();
    expect(setupWizardCommand).toHaveBeenCalledTimes(1);
  });
});
