#!/usr/bin/env node
import process from "node:process";
import { loadConfig } from "../config/config.js";
import { resolveGatewayPort } from "../config/paths.js";
import { formatUncaughtError } from "../infra/errors.js";
import { normalizeEnv } from "../infra/env.js";
import { ensureOpenClawExecMarkerOnProcess } from "../infra/openclaw-exec-env.js";
import { installUnhandledRejectionHandler } from "../infra/unhandled-rejections.js";
import { installProcessWarningFilter } from "../infra/warning-filter.js";
import { forceFreePortAndWait } from "../cli/ports.js";
import { startGatewayServer } from "./server.js";

type GatewayRunArgs = {
  bind?: "auto" | "loopback" | "lan" | "tailnet" | "custom";
  host?: string;
  port?: number;
  force: boolean;
  reset: boolean;
  help: boolean;
};

function printGatewayRunHelp(): void {
  process.stdout.write(
    [
      "Usage: gateway-run [options]",
      "",
      "Options:",
      "  --port <number>   Gateway port override",
      "  --bind <mode>     Bind mode override (auto|loopback|lan|tailnet|custom)",
      "  --host <host>     Explicit bind host override",
      "  --force           Free the gateway port before startup",
      "  --reset           Accepted for dev-script compatibility",
      "  --help            Show this help",
      "",
    ].join("\n"),
  );
}

function parsePositiveInteger(raw: string, flag: string): number {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${flag} value: ${raw}`);
  }
  return parsed;
}

function parseGatewayRunArgs(argv: string[]): GatewayRunArgs {
  const parsed: GatewayRunArgs = {
    force: false,
    reset: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index] ?? "";
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }
    if (arg === "--force") {
      parsed.force = true;
      continue;
    }
    if (arg === "--reset") {
      parsed.reset = true;
      continue;
    }
    if (arg === "--port") {
      parsed.port = parsePositiveInteger(argv[index + 1] ?? "", "--port");
      index += 1;
      continue;
    }
    if (arg.startsWith("--port=")) {
      parsed.port = parsePositiveInteger(arg.slice("--port=".length), "--port");
      continue;
    }
    if (arg === "--bind") {
      const value = argv[index + 1] ?? "";
      if (value !== "auto" && value !== "loopback" && value !== "lan" && value !== "tailnet" && value !== "custom") {
        throw new Error(`Invalid --bind value: ${value}`);
      }
      parsed.bind = value;
      index += 1;
      continue;
    }
    if (arg.startsWith("--bind=")) {
      const value = arg.slice("--bind=".length);
      if (value !== "auto" && value !== "loopback" && value !== "lan" && value !== "tailnet" && value !== "custom") {
        throw new Error(`Invalid --bind value: ${value}`);
      }
      parsed.bind = value;
      continue;
    }
    if (arg === "--host") {
      const value = argv[index + 1] ?? "";
      if (!value) {
        throw new Error("Missing value for --host");
      }
      parsed.host = value;
      index += 1;
      continue;
    }
    if (arg.startsWith("--host=")) {
      const value = arg.slice("--host=".length);
      if (!value) {
        throw new Error("Missing value for --host");
      }
      parsed.host = value;
      continue;
    }
    throw new Error(`Unknown gateway-run argument: ${arg}`);
  }

  return parsed;
}

async function main(): Promise<void> {
  process.title = "openclaw-gateway";
  ensureOpenClawExecMarkerOnProcess();
  installProcessWarningFilter();
  installUnhandledRejectionHandler();
  normalizeEnv();

  process.on("uncaughtException", (error) => {
    console.error("[openclaw] Uncaught exception:", formatUncaughtError(error));
    process.exit(1);
  });

  const args = parseGatewayRunArgs(process.argv.slice(2));
  if (args.help) {
    printGatewayRunHelp();
    return;
  }
  if (args.reset) {
    process.stderr.write("[openclaw] Ignoring --reset in the minimal gateway runner.\n");
  }

  const cfg = loadConfig();
  const port = args.port ?? resolveGatewayPort(cfg, process.env);
  if (args.force) {
    await forceFreePortAndWait(port);
  }

  const server = await startGatewayServer(port, {
    bind: args.bind,
    host: args.host,
  });

  let closing = false;
  const closeServer = async (signal: NodeJS.Signals) => {
    if (closing) {
      return;
    }
    closing = true;
    try {
      await server.close({ reason: signal });
      process.exit(0);
    } catch (error) {
      console.error(
        "[openclaw] Failed to stop gateway cleanly:",
        error instanceof Error ? (error.stack ?? error.message) : error,
      );
      process.exit(1);
    }
  };

  process.on("SIGINT", () => {
    void closeServer("SIGINT");
  });
  process.on("SIGTERM", () => {
    void closeServer("SIGTERM");
  });
}

void main().catch((error) => {
  console.error(
    "[openclaw] Gateway startup failed:",
    error instanceof Error ? error.stack ?? error.message : error,
  );
  process.exit(1);
});
