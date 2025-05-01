import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { join } from "path";
import { afterEach, describe, expect, test } from "vitest";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

describe("search queues tool", () => {
  let client: Client | null = null;

  afterEach(async () => {
    if (client) await client.close();
  });

  test("mock", async () => {
    // Debugging server possible by setting breakpoint inside js file
    const transport = new StdioClientTransport({
      command: "node",
      args: ["--inspect", join(__dirname, "../dist/index.js")],
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

    const queueName = "Test";
    const result = await client.callTool({
      name: "search_queues",
      arguments: { name: queueName },
    });

    const text = (result as CallToolResult).content[0].text;
    expect(text).toStrictEqual(
      `Found the following queues matching "Test":
• Name: Test_one
  • ID: 00000000-0000-0000-0000-000000000001
  • Description: Test queue description
  • Member Count: 30
• Name: Test_two
  • ID: 00000000-0000-0000-0000-000000000002
  • Member Count: 20
• Name: Test_three
  • ID: 00000000-0000-0000-0000-000000000003
--- Pagination Info ---
Page Number: N/A
Page Size: N/A
Total Pages: N/A
Total Matching Queues: N/A`,
    );
  });
});
