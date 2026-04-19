import { describe, expect, it, vi } from "vitest";
import { handleGatewayRequest } from "./server-methods.js";
import type { GatewayRequestHandler } from "./server-methods/types.js";

const noWebchat = () => false;

describe("gateway request gating", () => {
  function buildContext(logWarn = vi.fn()) {
    return {
      logGateway: {
        warn: logWarn,
      },
    } as unknown as Parameters<typeof handleGatewayRequest>[0]["context"];
  }

  function buildConnect(): NonNullable<
    Parameters<typeof handleGatewayRequest>[0]["client"]
  >["connect"] {
    return {
      role: "operator",
      scopes: ["operator.admin"],
      client: {
        id: "openclaw-control-ui",
        version: "1.0.0",
        platform: "darwin",
        mode: "ui",
      },
      minProtocol: 1,
      maxProtocol: 1,
    };
  }

  function buildClient() {
    return {
      connect: buildConnect(),
      connId: "conn-1",
      clientIp: "10.0.0.5",
    } as Parameters<typeof handleGatewayRequest>[0]["client"];
  }

  async function runRequest(params: {
    method: string;
    context: Parameters<typeof handleGatewayRequest>[0]["context"];
    client: Parameters<typeof handleGatewayRequest>[0]["client"];
    handler: GatewayRequestHandler;
  }) {
    const respond = vi.fn();
    await handleGatewayRequest({
      req: {
        type: "req",
        id: crypto.randomUUID(),
        method: params.method,
      },
      respond,
      client: params.client,
      isWebchatConnect: noWebchat,
      context: params.context,
      extraHandlers: {
        [params.method]: params.handler,
      },
    });
    return respond;
  }

  it("blocks startup-gated methods before dispatch", async () => {
    const handlerCalls = vi.fn();
    const handler: GatewayRequestHandler = (opts) => {
      handlerCalls(opts);
      opts.respond(true, undefined, undefined);
    };
    const context = {
      ...buildContext(),
      unavailableGatewayMethods: new Set(["chat.history", "models.list"]),
    } as Parameters<typeof handleGatewayRequest>[0]["context"];
    const client = buildClient();

    const blocked = await runRequest({ method: "models.list", context, client, handler });

    expect(handlerCalls).not.toHaveBeenCalled();
    expect(blocked).toHaveBeenCalledWith(
      false,
      undefined,
      expect.objectContaining({
        code: "UNAVAILABLE",
        retryable: true,
        retryAfterMs: 500,
        details: { method: "models.list" },
      }),
    );
  });
});
