import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(rootDir, "dist");
const cliDir = path.join(distDir, "cli");
const LEGACY_DAEMON_CLI_EXPORTS = [
  "registerDaemonCli",
  "runDaemonInstall",
  "runDaemonRestart",
  "runDaemonStart",
  "runDaemonStatus",
  "runDaemonStop",
  "runDaemonUninstall",
] as const;

const missingExportError = (name: string) =>
  `Legacy daemon CLI export "${name}" is unavailable in this build. Please upgrade OpenClaw.`;
const buildStubContents = () =>
  "// Legacy shim for pre-tsdown update-cli imports.\n" +
  LEGACY_DAEMON_CLI_EXPORTS.map((name) =>
    name === "registerDaemonCli"
      ? `export const ${name} = () => { throw new Error(${JSON.stringify(missingExportError(name))}); };`
      : `export const ${name} = async () => { throw new Error(${JSON.stringify(missingExportError(name))}); };`,
  ).join("\n") +
  "\n";

fs.mkdirSync(cliDir, { recursive: true });
fs.writeFileSync(path.join(cliDir, "daemon-cli.js"), buildStubContents());
