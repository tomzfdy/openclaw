import { cliCommandCatalog, type CliCommandCatalogEntry } from "../command-catalog.js";
import { matchesCommandPath } from "../command-path-matches.js";
import {
  routedCommandDefinitions,
  type AnyRoutedCommandDefinition,
} from "./routed-command-definitions.js";

export type RouteSpec = {
  match: (path: string[]) => boolean;
  run: (argv: string[]) => Promise<boolean>;
};

function createParsedRoute(params: {
  entry: CliCommandCatalogEntry;
  definition: AnyRoutedCommandDefinition;
}): RouteSpec {
  return {
    match: (path) =>
      matchesCommandPath(path, params.entry.commandPath, { exact: params.entry.exact }),
    run: async (argv) => {
      const args = params.definition.parseArgs(argv);
      if (!args) {
        return false;
      }
      await params.definition.runParsedArgs(args as never);
      return true;
    },
  };
}

export const routedCommands: RouteSpec[] = cliCommandCatalog
  .filter(
    (
      entry,
    ): entry is CliCommandCatalogEntry & { route: { id: keyof typeof routedCommandDefinitions } } =>
      Boolean(entry.route),
  )
  .map((entry) =>
    createParsedRoute({
      entry,
      definition: routedCommandDefinitions[entry.route.id],
    }),
  );
