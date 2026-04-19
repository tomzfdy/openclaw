export type CliRouteConfigGuardPolicy = "never" | "always" | "when-suppressed";
export type CliRoutedCommandId = "sessions";

export type CliCommandPathPolicy = {
  bypassConfigGuard: boolean;
  routeConfigGuard: CliRouteConfigGuardPolicy;
  hideBanner: boolean;
  ensureCliPath: boolean;
};

export type CliCommandCatalogEntry = {
  commandPath: readonly string[];
  exact?: boolean;
  policy?: Partial<CliCommandPathPolicy>;
  route?: {
    id: CliRoutedCommandId;
  };
};

export const cliCommandCatalog: readonly CliCommandCatalogEntry[] = [
  {
    commandPath: ["sessions"],
    exact: true,
    policy: { ensureCliPath: false },
    route: { id: "sessions" },
  },
  {
    commandPath: ["completion"],
    policy: {
      bypassConfigGuard: true,
      hideBanner: true,
    },
  },
];
