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
          resources: {
            // Support for dynamic resource reading
            subscribe: true,
            listChanged: true,
          },
          tools: {
            // Support for tool execution
            listChanged: true,
          },
          logging: {
            // Support for logging messages
          },
        },
        instructions: "Narrative MCP Server provides access to Narrative's data marketplace APIs. Available tools: echo (test), search_attributes (search Rosetta Stone), list_datasets (list available datasets). Resources are created dynamically when tools are used.",
      }
    );

    this.toolHandlers = new ToolHandlers(this.server, this.apiClient, resources);
    this.resourceHandlers = new ResourceHandlers(this.server, () => this.toolHandlers.getResources());

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupHandlers(): void {
    this.resourceHandlers.setup();
    this.toolHandlers.setup();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("[MCP Server] Error:", error);
      
      // Send logging message to client if possible
      if (this.server.getClientCapabilities()?.logging) {
        this.server.sendLoggingMessage({
          level: "error",
          data: error,
          logger: "narrative-mcp-server",
        }).catch((loggingError) => {
          console.error("[MCP Server] Failed to send logging message:", loggingError);
        });
      }
    };

    process.on("SIGINT", async () => {
      console.log("[MCP Server] Shutting down gracefully...");
      try {
        await this.server.close();
        console.log("[MCP Server] Server closed successfully");
      } catch (error) {
        console.error("[MCP Server] Error during shutdown:", error);
      }
      process.exit(0);
    });

    process.on("uncaughtException", (error) => {
      console.error("[MCP Server] Uncaught exception:", error);
      process.exit(1);
    });

    process.on("unhandledRejection", (reason, promise) => {
      console.error("[MCP Server] Unhandled rejection at:", promise, "reason:", reason);
      process.exit(1);
    });
  }

  public async run(): Promise<void> {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      // Set up initialization callback
      this.server.oninitialized = () => {
        const clientInfo = this.server.getClientVersion();
        const clientCaps = this.server.getClientCapabilities();
        
        console.error(`[MCP Server] Connected to client: ${clientInfo?.name || 'unknown'} v${clientInfo?.version || 'unknown'}`);
        console.error(`[MCP Server] Client capabilities: ${JSON.stringify(clientCaps)}`);
        
        // Send welcome logging message if client supports it
        if (clientCaps?.logging) {
          this.server.sendLoggingMessage({
            level: "info",
            data: "Narrative MCP Server initialized successfully",
            logger: "narrative-mcp-server",
          }).catch(console.error);
        }
      };
      
    } catch (error) {
      console.error("[MCP Server] Failed to start server:", error);
      throw error;
    }
  }
}

// Server startup with enhanced error handling
async function startServer(): Promise<void> {
  try {
    // Validate environment before starting
    validateEnvironmentVariables();
    
    console.error("[MCP Server] Starting Narrative MCP Server...");
    const server = new MyMcpServer();
    await server.run();
    
  } catch (error) {
    console.error("[MCP Server] Fatal error during startup:", error);
    process.exit(1);
  }
}

// Start server (this file is the main entry point)
startServer();