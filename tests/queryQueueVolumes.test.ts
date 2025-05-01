import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";
import { afterEach, describe, expect, test } from "vitest";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

describe("query queue volumes tool", () => {
  let client: Client | null = null;

  afterEach(async () => {
    if (client) await client.close();
  });

  test("mock", async () => {
    // Debugging server possible by setting breakpoint inside js file
    const transport = new StdioClientTransport({
      command: "node",
      args: ["--inspect", path.join(__dirname, "../dist/index.js")],
      env: {
        // Provides path for node binary to be used in test
        PATH: process.env.PATH!,
        MOCKING_ENABLED: "true",
      },
    });

    client = new Client({
      name: "test-client",
      version: "1.0.0",
    });

    await client.connect(transport);

    const result = await client.callTool({
      name: "query_queue_volumes",
      arguments: {
        queueIds: [
          "00000000-0000-0000-0000-000000000001",
          "00000000-0000-0000-0000-000000000002",
        ],
        startDate: new Date("2025-04-28T20:46:31.173Z"),
        endDate: new Date("2025-04-29T20:50:31.173Z"),
      },
    });

    const text = (result as CallToolResult).content[0].text;
    expect(text).toStrictEqual(
      `Queue volume breakdown for that period:
Queue ID: 00000000-0000-0000-0000-000000000001 - Total conversations: 1
Queue ID: 00000000-0000-0000-0000-000000000002 - Total conversations: 2`,
    );
  });
});
