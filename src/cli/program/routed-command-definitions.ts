import { defaultRuntime } from "../../runtime.js";
import { parseSessionsRouteArgs } from "./route-args.js";

type RouteArgParser<TArgs> = (argv: string[]) => TArgs | null;

type ParsedRouteArgs<TParse extends RouteArgParser<unknown>> = Exclude<ReturnType<TParse>, null>;

export type RoutedCommandDefinition<TParse extends RouteArgParser<unknown>> = {
  parseArgs: TParse;
  runParsedArgs: (args: ParsedRouteArgs<TParse>) => Promise<void>;
};

export type AnyRoutedCommandDefinition = {
  parseArgs: RouteArgParser<unknown>;
  runParsedArgs: (args: never) => Promise<void>;
};

function defineRoutedCommand<TParse extends RouteArgParser<unknown>>(
  definition: RoutedCommandDefinition<TParse>,
): RoutedCommandDefinition<TParse> {
  return definition;
}

export const routedCommandDefinitions = {
  sessions: defineRoutedCommand({
    parseArgs: parseSessionsRouteArgs,
    runParsedArgs: async (args) => {
      const { sessionsCommand } = await import("../../commands/sessions.js");
      await sessionsCommand(args, defaultRuntime);
    },
  }),
};
