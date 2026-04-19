#!/usr/bin/env node
import { spawn } from "node:child_process";
import process from "node:process";

function fail(message) {
  process.stderr.write(`[openclaw] ${message}\n`);
  process.exit(2);
}

const argv = process.argv.slice(2);
const separatorIndex = argv.indexOf("--");
if (separatorIndex === -1) {
  fail("with-env requires `-- <command> [args...]`");
}

const envAssignments = argv.slice(0, separatorIndex);
const commandArgs = argv.slice(separatorIndex + 1);
if (commandArgs.length === 0) {
  fail("with-env requires a command after `--`");
}

const nextEnv = { ...process.env };
for (const assignment of envAssignments) {
  const equalsIndex = assignment.indexOf("=");
  if (equalsIndex <= 0) {
    fail(`Invalid env assignment: ${assignment}`);
  }
  const key = assignment.slice(0, equalsIndex);
  const value = assignment.slice(equalsIndex + 1);
  nextEnv[key] = value;
}

const child = spawn(commandArgs[0], commandArgs.slice(1), {
  cwd: process.cwd(),
  env: nextEnv,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  process.stderr.write(
    `[openclaw] Failed to start ${commandArgs[0]}: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
