import { getPluginRegistryState } from "../plugins/runtime-state.js";
import { resolveReservedGatewayMethodScope } from "../shared/gateway-method-policy.js";
import {
  ADMIN_SCOPE,
  APPROVALS_SCOPE,
  PAIRING_SCOPE,
  READ_SCOPE,
  TALK_SECRETS_SCOPE,
  WRITE_SCOPE,
  type OperatorScope,
} from "./operator-scopes.js";

export {
  ADMIN_SCOPE,
  APPROVALS_SCOPE,
  PAIRING_SCOPE,
  READ_SCOPE,
  TALK_SECRETS_SCOPE,
  WRITE_SCOPE,
  type OperatorScope,
};

export const CLI_DEFAULT_OPERATOR_SCOPES: OperatorScope[] = [
  ADMIN_SCOPE,
  READ_SCOPE,
  WRITE_SCOPE,
  APPROVALS_SCOPE,
  PAIRING_SCOPE,
  TALK_SECRETS_SCOPE,
];

const NODE_ROLE_METHODS = new Set([
  "node.invoke.result",
  "node.event",
  "node.canvas.capability.refresh",
  "node.pending.pull",
  "node.pending.ack",
]);

const METHOD_SCOPE_GROUPS: Record<OperatorScope, readonly string[]> = {
  [APPROVALS_SCOPE]: [
    "exec.approval.get",
    "exec.approval.list",
    "exec.approval.request",
    "exec.approval.waitDecision",
    "exec.approval.resolve",
    "plugin.approval.list",
    "plugin.approval.request",
    "plugin.approval.waitDecision",
    "plugin.approval.resolve",
  ],
  [PAIRING_SCOPE]: [
    "node.pair.request",
    "node.pair.list",
    "node.pair.reject",
    "node.pair.verify",
    "node.pair.approve",
    "node.rename",
  ],
  [READ_SCOPE]: [
    "models.list",
    "agents.list",
    "agent.identity.get",
    "sessions.list",
    "sessions.get",
    "sessions.preview",
    "sessions.resolve",
    "sessions.compaction.list",
    "sessions.compaction.get",
    "sessions.subscribe",
    "sessions.unsubscribe",
    "sessions.messages.subscribe",
    "sessions.messages.unsubscribe",
    "node.list",
    "node.describe",
    "chat.history",
    "agents.files.list",
    "agents.files.get",
  ],
  [WRITE_SCOPE]: [
    "message.action",
    "send",
    "poll",
    "agent",
    "agent.wait",
    "node.invoke",
    "chat.send",
    "chat.abort",
    "sessions.create",
    "sessions.send",
    "sessions.steer",
    "sessions.abort",
    "sessions.compaction.branch",
  ],
  [ADMIN_SCOPE]: [
    "agents.create",
    "agents.update",
    "agents.delete",
    "sessions.patch",
    "sessions.reset",
    "sessions.delete",
    "sessions.compact",
    "sessions.compaction.restore",
    "connect",
    "chat.inject",
    "web.login.start",
    "web.login.wait",
    "agents.files.set",
  ],
  [TALK_SECRETS_SCOPE]: [],
};

const METHOD_SCOPE_BY_NAME = new Map<string, OperatorScope>(
  Object.entries(METHOD_SCOPE_GROUPS).flatMap(([scope, methods]) =>
    methods.map((method) => [method, scope as OperatorScope]),
  ),
);

function resolveScopedMethod(method: string): OperatorScope | undefined {
  const explicitScope = METHOD_SCOPE_BY_NAME.get(method);
  if (explicitScope) {
    return explicitScope;
  }
  const reservedScope = resolveReservedGatewayMethodScope(method);
  if (reservedScope) {
    return reservedScope;
  }
  const pluginScope = getPluginRegistryState()?.activeRegistry?.gatewayMethodScopes?.[method];
  if (pluginScope) {
    return pluginScope;
  }
  return undefined;
}

export function isApprovalMethod(method: string): boolean {
  return resolveScopedMethod(method) === APPROVALS_SCOPE;
}

export function isPairingMethod(method: string): boolean {
  return resolveScopedMethod(method) === PAIRING_SCOPE;
}

export function isReadMethod(method: string): boolean {
  return resolveScopedMethod(method) === READ_SCOPE;
}

export function isWriteMethod(method: string): boolean {
  return resolveScopedMethod(method) === WRITE_SCOPE;
}

export function isNodeRoleMethod(method: string): boolean {
  return NODE_ROLE_METHODS.has(method);
}

export function isAdminOnlyMethod(method: string): boolean {
  return resolveScopedMethod(method) === ADMIN_SCOPE;
}

export function resolveRequiredOperatorScopeForMethod(method: string): OperatorScope | undefined {
  return resolveScopedMethod(method);
}

export function resolveLeastPrivilegeOperatorScopesForMethod(method: string): OperatorScope[] {
  const requiredScope = resolveRequiredOperatorScopeForMethod(method);
  if (requiredScope) {
    return [requiredScope];
  }
  // Default-deny for unclassified methods.
  return [];
}

export function authorizeOperatorScopesForMethod(
  method: string,
  scopes: readonly string[],
): { allowed: true } | { allowed: false; missingScope: OperatorScope } {
  if (scopes.includes(ADMIN_SCOPE)) {
    return { allowed: true };
  }
  const requiredScope = resolveRequiredOperatorScopeForMethod(method) ?? ADMIN_SCOPE;
  if (requiredScope === READ_SCOPE) {
    if (scopes.includes(READ_SCOPE) || scopes.includes(WRITE_SCOPE)) {
      return { allowed: true };
    }
    return { allowed: false, missingScope: READ_SCOPE };
  }
  if (scopes.includes(requiredScope)) {
    return { allowed: true };
  }
  return { allowed: false, missingScope: requiredScope };
}

export function isGatewayMethodClassified(method: string): boolean {
  if (isNodeRoleMethod(method)) {
    return true;
  }
  return resolveRequiredOperatorScopeForMethod(method) !== undefined;
}
