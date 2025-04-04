// src/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { Resource } from "./types/index.js";
import dotenv from "dotenv";

dotenv.config();

// Sample resources (replace with your own)
const resources: Record<string, Resource> = {
  "1": {
    id: "1",
    name: "Sample Resource",
    content: "This is a sample resource that Claude can access.",
  },
};

class MyMcpServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "my-mcp-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupResourceHandlers();
    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupResourceHandlers(): void {
    // Handle resource listing
    this.server.setRequestHandler(
      ListResourcesRequestSchema,
      async () => ({
        resources: Object.values(resources).map((resource) => ({
          uri: `resource:///${resource.id}`,
          name: resource.name,
          mimeType: "text/plain",
          description: `Resource: ${resource.name}`,
        })),
      })
    );

    // Handle resource reading
    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        const url = new URL(request.params.uri);
        const id = url.pathname.replace(/^\//, "");
        const resource = resources[id];

        if (!resource) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Resource ${id} not found`
          );
        }

        return {
          contents: [
            {
              uri: request.params.uri,
              mimeType: "text/plain",
              text: resource.content,
            },
          ],
        };
      }
    );
  }

  private setupToolHandlers(): void {
    // Handle tool listing
    this.server.setRequestHandler(
      ListToolsRequestSchema,
      async () => ({
        tools: [
          {
            name: "echo",
            description: "Echo back a message",
            inputSchema: {
              type: "object",
              properties: {
                message: {
                  type: "string",
                  description: "Message to echo back",
                },
              },
              required: ["message"],
            },
          },
        ],
      })
    );

    // Handle tool calls
    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request) => {
        if (request.params.name !== "echo") {
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
        }

        const message = request.params.arguments?.message;
        if (typeof message !== "string") {
          throw new McpError(
            ErrorCode.InvalidParams,
            "Message parameter must be a string"
          );
        }

        return {
          content: [
            {
              type: "text",
              text: `Echo: ${message}`,
            },
          ],
        };
      }
    );
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error("MCP server running on stdio");
  }
}

// Start the server
const server = new MyMcpServer();
server.run().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});