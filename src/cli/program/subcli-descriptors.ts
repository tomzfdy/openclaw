import { defineCommandDescriptorCatalog } from "./command-descriptor-utils.js";
import type { NamedCommandDescriptor } from "./command-group-descriptors.js";

export type SubCliDescriptor = NamedCommandDescriptor;

const subCliCommandCatalog = defineCommandDescriptorCatalog([
  {
    name: "completion",
    description: "Generate shell completion script",
    hasSubcommands: false,
  },
] as const satisfies ReadonlyArray<SubCliDescriptor>);

export const SUB_CLI_DESCRIPTORS = subCliCommandCatalog.descriptors;

export function getSubCliEntries(): ReadonlyArray<SubCliDescriptor> {
  return subCliCommandCatalog.getDescriptors();
}

export function getSubCliCommandsWithSubcommands(): string[] {
  return subCliCommandCatalog.getCommandsWithSubcommands();
}
