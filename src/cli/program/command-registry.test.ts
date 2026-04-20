import { Command } from "commander";
import { describe, expect, it, vi } from "vitest";
import type { ProgramContext } from "./context.js";

vi.mock("./register.maintenance.js", () => ({
  registerMaintenanceCommands: (program: Command) => {
    program.command("dashboard");
    program.command("reset");
    program.command("uninstall");
  },
}));

vi.mock("./register.status-health-sessions.js", () => ({
  registerStatusHealthSessionsCommands: (program: Command) => {
    program.command("sessions");
    const tasks = program.command("tasks");
    tasks.command("show");
  },
}));

import {
  getCoreCliCommandNames,
  getCoreCliCommandsWithSubcommands,
  registerCoreCliByName,
  registerCoreCliCommands,
} from "./command-registry.js";

const testProgramContext: ProgramContext = {
  programVersion: "0.0.0-test",
  channelOptions: [],
  messageChannelOptions: "",
  agentChannelOptions: "",
};

describe("command-registry", () => {
  const createProgram = () => new Command();
  const namesOf = (program: Command) => program.commands.map((command) => command.name());

  const withProcessArgv = async (argv: string[], run: () => Promise<void>) => {
    const prevArgv = process.argv;
    process.argv = argv;
    try {
      await run();
    } finally {
      process.argv = prevArgv;
    }
  };

  it("lists only the reduced core command set", () => {
    expect(getCoreCliCommandNames()).toEqual([
      "setup",
      "dashboard",
      "reset",
      "uninstall",
      "sessions",
      "tasks",
    ]);
  });

  it("returns only commands that still have subcommands", () => {
    expect(getCoreCliCommandsWithSubcommands()).toEqual(["sessions", "tasks"]);
  });

  it("registerCoreCliByName returns false for unknown commands", async () => {
    const program = createProgram();
    expect(await registerCoreCliByName(program, testProgramContext, "nonexistent")).toBe(false);
  });

  it("narrows to the primary command when command help is requested", () => {
    const program = createProgram();
    registerCoreCliCommands(program, testProgramContext, ["node", "openclaw", "dashboard", "--help"]);

    expect(namesOf(program)).toEqual(["dashboard"]);
  });

  it("keeps all reduced placeholders for root help", () => {
    const program = createProgram();
    registerCoreCliCommands(program, testProgramContext, ["node", "openclaw", "--help"]);

    expect(namesOf(program)).toEqual([
      "dashboard",
      "reset",
      "sessions",
      "setup",
      "tasks",
      "uninstall",
    ]);
  });

  it("treats maintenance commands as top-level builtins", async () => {
    const program = createProgram();

    expect(await registerCoreCliByName(program, testProgramContext, "dashboard")).toBe(true);
    expect(namesOf(program)).toEqual(["dashboard", "reset", "uninstall"]);
  });

  it("registers grouped core entry placeholders without duplicate command errors", async () => {
    const program = createProgram();
    registerCoreCliCommands(program, testProgramContext, ["node", "openclaw", "vitest"]);
    program.exitOverride();

    await withProcessArgv(["node", "openclaw", "sessions"], async () => {
      await program.parseAsync(["node", "openclaw", "sessions"]);
    });

    expect(namesOf(program)).toContain("sessions");
    expect(namesOf(program)).toContain("tasks");
  });

  it("replaces placeholders when loading a grouped entry by secondary command name", async () => {
    const program = createProgram();
    registerCoreCliCommands(program, testProgramContext, ["node", "openclaw", "sessions"]);
    expect(namesOf(program)).toEqual(["sessions"]);

    const found = await registerCoreCliByName(program, testProgramContext, "tasks");
    expect(found).toBe(true);
    expect(namesOf(program)).toEqual(["sessions", "tasks"]);
  });
});
