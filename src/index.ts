// src/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Resource } from "./types/index.js";
import { config, validateEnvironmentVariables } from "./lib/config.js";
import { NarrativeApiClient } from "./lib/api-client.js";
import { ToolHandlers } from "./handlers/tool-handlers.js";
import { ResourceHandlers } from "./handlers/resource-handlers.js";

// Export for testing
export { validateEnvironmentVariables };

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
  private apiClient: NarrativeApiClient;
  private toolHandlers: ToolHandlers;
  private resourceHandlers: ResourceHandlers;

  constructor() {
    try {
      this.apiClient = new NarrativeApiClient(config.apiUrl, config.apiToken);
    } catch (error) {
      console.error("Failed to initialize MCP server:", error);
      throw error;
    }

    this.server = new Server(
      {
        name: "narrative-mcp-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.toolHandlers = new ToolHandlers(this.server, this.apiClient, resources);
    this.resourceHandlers = new ResourceHandlers(this.server, resources);

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupHandlers(): void {
    this.resourceHandlers.setup();
    this.toolHandlers.setup();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("Server error:", error);
    };

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  public async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    //console.log("MCP server started");
  }
}

// Keep your existing server startup code
const server = new MyMcpServer();
server.run().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});