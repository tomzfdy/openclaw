import { describe, expect, it, vi } from "vitest";
import { renderRootHelpText } from "./root-help.js";

vi.mock("./core-command-descriptors.js", () => ({
  getCoreCliCommandDescriptors: () => [
    {
      name: "sessions",
      description: "List sessions",
      hasSubcommands: false,
    },
  ],
  getCoreCliCommandsWithSubcommands: () => [],
}));

vi.mock("./subcli-descriptors.js", () => ({
  getSubCliEntries: () => [
    {
      name: "completion",
      description: "Generate completion",
      hasSubcommands: false,
    },
  ],
  getSubCliCommandsWithSubcommands: () => [],
}));

describe("root help", () => {
  it("includes only core and reduced sub-CLI commands", async () => {
    const text = await renderRootHelpText();

    expect(text).toContain("sessions");
    expect(text).toContain("completion");
    expect(text).not.toContain("matrix");
  });
});
