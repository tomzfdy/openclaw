import type { Command } from "commander";
import { flowsCancelCommand, flowsListCommand, flowsShowCommand } from "../../commands/flows.js";
import { sessionsCleanupCommand } from "../../commands/sessions-cleanup.js";
import { sessionsCommand } from "../../commands/sessions.js";
import {
  tasksAuditCommand,
  tasksCancelCommand,
  tasksListCommand,
  tasksMaintenanceCommand,
  tasksNotifyCommand,
  tasksShowCommand,
} from "../../commands/tasks.js";
import { defaultRuntime } from "../../runtime.js";
import { runCommandWithRuntime } from "../cli-utils.js";
import { formatHelpExamples } from "../help-format.js";
import { theme } from "../../terminal/theme.js";
import { parsePositiveIntOrUndefined } from "./helpers.js";

export function registerStatusHealthSessionsCommands(program: Command) {
  const sessionsCmd = program
    .command("sessions")
    .description("List stored conversation sessions")
    .option("--json", "Output as JSON", false)
    .option("--store <path>", "Path to session store (default: resolved from config)")
    .option("--agent <id>", "Agent id to inspect (default: configured default agent)")
    .option("--all-agents", "Aggregate sessions across all configured agents", false)
    .option("--active <minutes>", "Only show sessions updated within the past N minutes")
    .action(async (opts) => {
      await sessionsCommand(
        {
          json: Boolean(opts.json),
          store: opts.store as string | undefined,
          agent: opts.agent as string | undefined,
          allAgents: Boolean(opts.allAgents),
          active: opts.active as string | undefined,
        },
        defaultRuntime,
      );
    });
  sessionsCmd.enablePositionalOptions();

  sessionsCmd
    .command("cleanup")
    .description("Run session-store maintenance now")
    .option("--store <path>", "Path to session store (default: resolved from config)")
    .option("--agent <id>", "Agent id to maintain (default: configured default agent)")
    .option("--all-agents", "Run maintenance across all configured agents", false)
    .option("--dry-run", "Preview maintenance actions without writing", false)
    .option("--enforce", "Apply maintenance even when configured mode is warn", false)
    .option(
      "--fix-missing",
      "Remove store entries whose transcript files are missing (bypasses age/count retention)",
      false,
    )
    .option("--active-key <key>", "Protect this session key from budget-eviction")
    .option("--json", "Output JSON", false)
    .addHelpText(
      "after",
      () =>
        `\n${theme.heading("Examples:")}\n${formatHelpExamples([
          ["openclaw sessions cleanup --dry-run", "Preview stale/cap cleanup."],
          [
            "openclaw sessions cleanup --dry-run --fix-missing",
            "Also preview pruning entries with missing transcript files.",
          ],
          ["openclaw sessions cleanup --enforce", "Apply maintenance now."],
          ["openclaw sessions cleanup --agent work --dry-run", "Preview one agent store."],
          ["openclaw sessions cleanup --all-agents --dry-run", "Preview all agent stores."],
          [
            "openclaw sessions cleanup --enforce --store ./tmp/sessions.json",
            "Use a specific store.",
          ],
        ])}`,
    )
    .action(async (opts, command) => {
      const parentOpts = command.parent?.opts() as
        | {
            store?: string;
            agent?: string;
            allAgents?: boolean;
            json?: boolean;
          }
        | undefined;
      await runCommandWithRuntime(defaultRuntime, async () => {
        await sessionsCleanupCommand(
          {
            store: (opts.store as string | undefined) ?? parentOpts?.store,
            agent: (opts.agent as string | undefined) ?? parentOpts?.agent,
            allAgents: Boolean(opts.allAgents || parentOpts?.allAgents),
            dryRun: Boolean(opts.dryRun),
            enforce: Boolean(opts.enforce),
            fixMissing: Boolean(opts.fixMissing),
            activeKey: opts.activeKey as string | undefined,
            json: Boolean(opts.json || parentOpts?.json),
          },
          defaultRuntime,
        );
      });
    });

  const tasksCmd = program
    .command("tasks")
    .description("Inspect durable background tasks and TaskFlow state")
    .option("--json", "Output as JSON", false)
    .option("--runtime <name>", "Filter by kind (subagent, acp, cron, cli)")
    .option(
      "--status <name>",
      "Filter by status (queued, running, succeeded, failed, timed_out, cancelled, lost)",
    )
    .action(async (opts) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        await tasksListCommand(
          {
            json: Boolean(opts.json),
            runtime: opts.runtime as string | undefined,
            status: opts.status as string | undefined,
          },
          defaultRuntime,
        );
      });
    });
  tasksCmd.enablePositionalOptions();

  tasksCmd
    .command("list")
    .description("List tracked background tasks")
    .option("--json", "Output as JSON", false)
    .option("--runtime <name>", "Filter by kind (subagent, acp, cron, cli)")
    .option(
      "--status <name>",
      "Filter by status (queued, running, succeeded, failed, timed_out, cancelled, lost)",
    )
    .action(async (opts, command) => {
      const parentOpts = command.parent?.opts() as
        | {
            json?: boolean;
            runtime?: string;
            status?: string;
          }
        | undefined;
      await runCommandWithRuntime(defaultRuntime, async () => {
        await tasksListCommand(
          {
            json: Boolean(opts.json || parentOpts?.json),
            runtime: (opts.runtime as string | undefined) ?? parentOpts?.runtime,
            status: (opts.status as string | undefined) ?? parentOpts?.status,
          },
          defaultRuntime,
        );
      });
    });

  tasksCmd
    .command("audit")
    .description("Show stale or broken background tasks and TaskFlows")
    .option("--json", "Output as JSON", false)
    .option("--severity <level>", "Filter by severity (warn, error)")
    .option(
      "--code <name>",
      "Filter by finding code (stale_queued, stale_running, lost, delivery_failed, missing_cleanup, inconsistent_timestamps, restore_failed, stale_waiting, stale_blocked, cancel_stuck, missing_linked_tasks, blocked_task_missing)",
    )
    .option("--limit <n>", "Limit displayed findings")
    .action(async (opts, command) => {
      const parentOpts = command.parent?.opts() as { json?: boolean } | undefined;
      await runCommandWithRuntime(defaultRuntime, async () => {
        await tasksAuditCommand(
          {
            json: Boolean(opts.json || parentOpts?.json),
            severity: opts.severity as "warn" | "error" | undefined,
            code: opts.code as
              | "stale_queued"
              | "stale_running"
              | "lost"
              | "delivery_failed"
              | "missing_cleanup"
              | "inconsistent_timestamps"
              | "restore_failed"
              | "stale_waiting"
              | "stale_blocked"
              | "cancel_stuck"
              | "missing_linked_tasks"
              | "blocked_task_missing"
              | undefined,
            limit: parsePositiveIntOrUndefined(opts.limit),
          },
          defaultRuntime,
        );
      });
    });

  tasksCmd
    .command("maintenance")
    .description("Preview or apply tasks and TaskFlow maintenance")
    .option("--json", "Output as JSON", false)
    .option("--apply", "Apply reconciliation, cleanup stamping, and pruning", false)
    .action(async (opts, command) => {
      const parentOpts = command.parent?.opts() as { json?: boolean } | undefined;
      await runCommandWithRuntime(defaultRuntime, async () => {
        await tasksMaintenanceCommand(
          {
            json: Boolean(opts.json || parentOpts?.json),
            apply: Boolean(opts.apply),
          },
          defaultRuntime,
        );
      });
    });

  tasksCmd
    .command("show")
    .description("Show one background task by task id, run id, or session key")
    .argument("<lookup>", "Task id, run id, or session key")
    .option("--json", "Output as JSON", false)
    .action(async (lookup, opts, command) => {
      const parentOpts = command.parent?.opts() as { json?: boolean } | undefined;
      await runCommandWithRuntime(defaultRuntime, async () => {
        await tasksShowCommand(
          {
            lookup,
            json: Boolean(opts.json || parentOpts?.json),
          },
          defaultRuntime,
        );
      });
    });

  tasksCmd
    .command("notify")
    .description("Set task notify policy")
    .argument("<lookup>", "Task id, run id, or session key")
    .argument("<notify>", "Notify policy (done_only, state_changes, silent)")
    .action(async (lookup, notify) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        await tasksNotifyCommand(
          {
            lookup,
            notify: notify as "done_only" | "state_changes" | "silent",
          },
          defaultRuntime,
        );
      });
    });

  tasksCmd
    .command("cancel")
    .description("Cancel a running background task")
    .argument("<lookup>", "Task id, run id, or session key")
    .action(async (lookup) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        await tasksCancelCommand(
          {
            lookup,
          },
          defaultRuntime,
        );
      });
    });

  const tasksFlowCmd = tasksCmd
    .command("flow")
    .description("Inspect durable TaskFlow state under tasks");

  tasksFlowCmd
    .command("list")
    .description("List tracked TaskFlows")
    .option("--json", "Output as JSON", false)
    .option(
      "--status <name>",
      "Filter by status (queued, running, waiting, blocked, succeeded, failed, cancelled, lost)",
    )
    .action(async (opts) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        await flowsListCommand(
          {
            json: Boolean(opts.json),
            status: opts.status as string | undefined,
          },
          defaultRuntime,
        );
      });
    });

  tasksFlowCmd
    .command("show")
    .description("Show one TaskFlow by flow id or owner key")
    .argument("<lookup>", "Flow id or owner key")
    .option("--json", "Output as JSON", false)
    .action(async (lookup, opts) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        await flowsShowCommand(
          {
            lookup,
            json: Boolean(opts.json),
          },
          defaultRuntime,
        );
      });
    });

  tasksFlowCmd
    .command("cancel")
    .description("Cancel a running TaskFlow")
    .argument("<lookup>", "Flow id or owner key")
    .action(async (lookup) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        await flowsCancelCommand(
          {
            lookup,
          },
          defaultRuntime,
        );
      });
    });
}
