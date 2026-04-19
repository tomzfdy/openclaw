import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerSubCliByName, registerSubCliCommands } from "./register.subclis.js";

const { completionAction, registerCompletionCli } = vi.hoisted(() => {
  const action = vi.fn();
  const register = vi.fn((program: Command) => {
    program.command("completion").action(action);
  });
  return { completionAction: action, registerCompletionCli: register };
});

vi.mock("../completion-cli.js", () => ({ registerCompletionCli }));

describe("registerSubCliCommands", () => {
  const originalArgv = process.argv;
  const originalDisableLazySubcommands = process.env.OPENCLAW_DISABLE_LAZY_SUBCOMMANDS;

  const createRegisteredProgram = (argv: string[], name?: string) => {
    process.argv = argv;
    const program = new Command();
    if (name) {
      program.name(name);
    }
    registerSubCliCommands(program, process.argv);
    return program;
  };

  beforeEach(() => {
    if (originalDisableLazySubcommands === undefined) {
      delete process.env.OPENCLAW_DISABLE_LAZY_SUBCOMMANDS;
    } else {
      process.env.OPENCLAW_DISABLE_LAZY_SUBCOMMANDS = originalDisableLazySubcommands;
    }
    registerCompletionCli.mockClear();
    completionAction.mockClear();
  });

  afterEach(() => {
    process.argv = originalArgv;
    if (originalDisableLazySubcommands === undefined) {
      delete process.env.OPENCLAW_DISABLE_LAZY_SUBCOMMANDS;
    } else {
      process.env.OPENCLAW_DISABLE_LAZY_SUBCOMMANDS = originalDisableLazySubcommands;
    }
  });

  it("registers only the completion placeholder when no primary is provided", () => {
    const program = createRegisteredProgram(["node", "openclaw"]);

    expect(program.commands.map((cmd) => cmd.name())).toEqual(["completion"]);
  });

  it("registers the primary completion placeholder and dispatches", async () => {
    const program = createRegisteredProgram(["node", "openclaw", "completion"], "openclaw");

    expect(program.commands.map((cmd) => cmd.name())).toEqual(["completion"]);

    await program.parseAsync(["completion"], { from: "user" });

    expect(registerCompletionCli).toHaveBeenCalledTimes(1);
    expect(completionAction).toHaveBeenCalledTimes(1);
  });

  it("replaces placeholder when registering a subcommand by name", async () => {
    const program = createRegisteredProgram(["node", "openclaw", "completion", "--help"], "openclaw");

    await registerSubCliByName(program, "completion");

    const names = program.commands.map((cmd) => cmd.name());
    expect(names.filter((name) => name === "completion")).toHaveLength(1);

    await program.parseAsync(["completion"], { from: "user" });
    expect(registerCompletionCli).toHaveBeenCalledTimes(1);
    expect(completionAction).toHaveBeenCalledTimes(1);
  });
});
