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
import type { Resource, AttributeResponse, DatasetResponse } from "./types/index.js";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

// Function to validate environment variables (exported for testing)
export function validateEnvironmentVariables(env = process.env): { apiUrl: string; apiToken: string } {
  const NARRATIVE_API_URL = env.NARRATIVE_API_URL;
  const NARRATIVE_API_TOKEN = env.NARRATIVE_API_TOKEN;

  if (!NARRATIVE_API_URL) {
    throw new Error("NARRATIVE_API_URL environment variable is required");
  }

  if (!NARRATIVE_API_TOKEN) {
    throw new Error("NARRATIVE_API_TOKEN environment variable is required");
  }

  return {
    apiUrl: NARRATIVE_API_URL,
    apiToken: NARRATIVE_API_TOKEN
  };
}

// Validate required environment variables
const { apiUrl: NARRATIVE_API_URL, apiToken: NARRATIVE_API_TOKEN } = validateEnvironmentVariables();

// Sample resources (replace with your own)
const resources: Record<string, Resource> = {
  "1": {
    id: "1",
    name: "Sample Resource",
    content: "This is a sample resource that Claude can access.",
  },
};

// Add this function to fetch attributes
async function fetchAttributes(query: string = "", page: number = 1, perPage: number = 10): Promise<AttributeResponse> {
  const url = new URL(`${NARRATIVE_API_URL}/attributes`);
  
  if (query) {
    url.searchParams.append("q", query);
  }
  
  url.searchParams.append("page", page.toString());
  url.searchParams.append("per_page", perPage.toString());
  
  try {
    const response = await axios.get<AttributeResponse>(url.toString(), {
      headers: {
        'Authorization': `Bearer ${NARRATIVE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching attributes:", error);
    throw error;
  }
}

// Function to fetch datasets
async function fetchDatasets(): Promise<DatasetResponse> {
  const url = new URL(`${NARRATIVE_API_URL}/datasets`);
  
  try {
    const response = await axios.get<DatasetResponse>(url.toString(), {
      headers: {
        'Authorization': `Bearer ${NARRATIVE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching datasets:", error);
    throw error;
  }
}

class MyMcpServer {
  private server: Server;

  constructor() {
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

    this.setupResourceHandlers();
    this.setupToolHandlers();
    this.setupErrorHandling();
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
          {
            name: "search_attributes",
            description: "Search Narrative Rosetta Stone Attributes",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Search term for attributes",
                },
                page: {
                  type: "number",
                  description: "Page number (starts at 1)",
                },
                perPage: {
                  type: "number",
                  description: "Results per page (default: 10)",
                },
              },
              required: ["query"],
            },
          },
          {
            name: "list_datasets",
            description: "List all available datasets from Narrative marketplace",
            inputSchema: {
              type: "object",
              properties: {},
              required: [],
            },
          },
        ],
      })
    );

    // Handle tool calls
    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request) => {
        if (request.params.name === "echo") {
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
        if (request.params.name === "search_attributes") {
          const query = request.params.arguments?.query as string;
          const page = (request.params.arguments?.page as number) || 1;
          const perPage = (request.params.arguments?.perPage as number) || 10;

          try {
            const response = await fetchAttributes(query, page, perPage);
            
            // Store attributes in memory for resource access
            for (const attr of response.records) {
              resources[`attr-${attr.id}`] = {
                id: `attr-${attr.id}`,
                name: attr.display_name,
                content: JSON.stringify(attr, null, 2),
              };
            }

            // Format the response
            const formattedResults = response.records.map(attr => 
              `- ${attr.display_name} (${attr.name}): ${attr.description.substring(0, 100)}...`
            ).join('\n');

            return {
              content: [
                {
                  type: "text",
                  text: `Found ${response.total_records} attributes matching "${query}"\nPage ${response.current_page} of ${response.total_pages}\n\n${formattedResults}\n\nYou can access full attribute details as resources.`
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  type: "text",
                  text: `Error searching attributes: ${error}`,
                },
              ],
              isError: true,
            };
          }
        }
        if (request.params.name === "list_datasets") {
          try {
            const response = await fetchDatasets();
            
            // Store datasets in memory for resource access
            for (const dataset of response.records) {
              resources[`dataset-${dataset.id}`] = {
                id: `dataset-${dataset.id}`,
                name: dataset.name,
                content: JSON.stringify(dataset, null, 2),
              };
            }

            // Format the response
            const formattedResults = response.records.map(dataset => 
              `- ${dataset.name} (ID: ${dataset.id}): ${dataset.description.substring(0, 100)}...`
            ).join('\n');

            return {
              content: [
                {
                  type: "text",
                  text: `Found ${response.records.length} datasets\n\n${formattedResults}\n\nYou can access full dataset details as resources.`
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  type: "text",
                  text: `Error fetching datasets: ${error}`,
                },
              ],
              isError: true,
            };
          }
        }
        else {
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
        }
      }
    );
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