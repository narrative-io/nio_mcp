import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import type { Resource } from "../types/index.js";
import { NarrativeApiClient } from "../lib/api-client.js";

export class ToolHandlers {
  constructor(
    private server: Server,
    private apiClient: NarrativeApiClient,
    private resources: Record<string, Resource>
  ) {}

  setup(): void {
    this.setupToolsList();
    this.setupToolCalls();
  }

  private setupToolsList(): void {
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
  }

  private setupToolCalls(): void {
    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request) => {
        switch (request.params.name) {
          case "echo":
            return this.handleEcho(request.params.arguments);
          case "search_attributes":
            return this.handleSearchAttributes(request.params.arguments);
          case "list_datasets":
            return this.handleListDatasets(request.params.arguments);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      }
    );
  }

  private async handleEcho(args: any) {
    const message = args?.message;
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

  private async handleSearchAttributes(args: any) {
    const query = args?.query as string;
    const page = (args?.page as number) || 1;
    const perPage = (args?.perPage as number) || 10;

    try {
      const response = await this.apiClient.fetchAttributes(query, page, perPage);
      
      // Store attributes in memory for resource access
      for (const attr of response.records) {
        this.resources[`attr-${attr.id}`] = {
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

  private async handleListDatasets(args: any) {
    try {
      const response = await this.apiClient.fetchDatasets();
      
      // Store datasets in memory for resource access
      for (const dataset of response.records) {
        this.resources[`dataset-${dataset.id}`] = {
          id: `dataset-${dataset.id}`,
          name: dataset.name,
          content: JSON.stringify(dataset, null, 2),
        };
      }

      // Format the response
      const formattedResults = response.records.map(dataset => {
        const description = dataset.description ? dataset.description.substring(0, 100) : 'No description available';
        return `- ${dataset.name} (ID: ${dataset.id}): ${description}...`;
      }).join('\n');

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
}