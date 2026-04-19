import { withPluginRuntimeGatewayRequestScope } from "../plugins/runtime/gateway-request-scope.js";
import { ADMIN_SCOPE, authorizeOperatorScopesForMethod } from "./method-scopes.js";
import { ErrorCodes, errorShape } from "./protocol/index.js";
import { isRoleAuthorizedForMethod, parseGatewayRole } from "./role-policy.js";
import { agentHandlers } from "./server-methods/agent.js";
import { agentsHandlers } from "./server-methods/agents.js";
import { chatHandlers } from "./server-methods/chat.js";
import { connectHandlers } from "./server-methods/connect.js";
import { modelsHandlers } from "./server-methods/models.js";
import { nodeHandlers } from "./server-methods/nodes.js";
import { sendHandlers } from "./server-methods/send.js";
import { sessionsHandlers } from "./server-methods/sessions.js";
import type { GatewayRequestHandlers, GatewayRequestOptions } from "./server-methods/types.js";
import { webHandlers } from "./server-methods/web.js";

function authorizeGatewayMethod(method: string, client: GatewayRequestOptions["client"]) {
  if (!client?.connect) {
    return null;
  }
  const roleRaw = client.connect.role ?? "operator";
  const role = parseGatewayRole(roleRaw);
  if (!role) {
    return errorShape(ErrorCodes.INVALID_REQUEST, `unauthorized role: ${roleRaw}`);
  }
  const scopes = client.connect.scopes ?? [];
  if (!isRoleAuthorizedForMethod(role, method)) {
    return errorShape(ErrorCodes.INVALID_REQUEST, `unauthorized role: ${role}`);
  }
  if (role === "node") {
    return null;
  }
  if (scopes.includes(ADMIN_SCOPE)) {
    return null;
  }
  const scopeAuth = authorizeOperatorScopesForMethod(method, scopes);
  if (!scopeAuth.allowed) {
    return errorShape(ErrorCodes.INVALID_REQUEST, `missing scope: ${scopeAuth.missingScope}`);
  }
  return null;
}

export const coreGatewayHandlers: GatewayRequestHandlers = {
  ...connectHandlers,

  ...chatHandlers,

  ...webHandlers,
  ...modelsHandlers,

  ...sessionsHandlers,
  ...nodeHandlers,
  ...sendHandlers,

  ...agentHandlers,
  ...agentsHandlers,
};

export async function handleGatewayRequest(
  opts: GatewayRequestOptions & { extraHandlers?: GatewayRequestHandlers },
): Promise<void> {
  const { req, respond, client, isWebchatConnect, context } = opts;
  const authError = authorizeGatewayMethod(req.method, client);
  if (authError) {
    respond(false, undefined, authError);
    return;
  }
  if (context.unavailableGatewayMethods?.has(req.method)) {
    respond(
      false,
      undefined,
      errorShape(ErrorCodes.UNAVAILABLE, `${req.method} unavailable during gateway startup`, {
        retryable: true,
        retryAfterMs: 500,
        details: { method: req.method },
      }),
    );
    return;
  }
  const handler = opts.extraHandlers?.[req.method] ?? coreGatewayHandlers[req.method];
  if (!handler) {
    respond(
      false,
      undefined,
      errorShape(ErrorCodes.INVALID_REQUEST, `unknown method: ${req.method}`),
    );
    return;
  }
  const invokeHandler = () =>
    handler({
      req,
      params: (req.params ?? {}) as Record<string, unknown>,
      client,
      isWebchatConnect,
      respond,
      context,
    });
  // All handlers run inside a request scope so that plugin runtime
  // subagent methods (e.g. context engine tools spawning sub-agents
  // during tool execution) can dispatch back into the gateway.
  await withPluginRuntimeGatewayRequestScope({ context, client, isWebchatConnect }, invokeHandler);
}
