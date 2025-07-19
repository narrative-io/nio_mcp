import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import type { Resource } from "../types/index.js";

export class ResourceHandlers {
  constructor(
    private server: Server,
    private resources: Record<string, Resource>
  ) {}

  setup(): void {
    this.setupResourceList();
    this.setupResourceRead();
  }

  private setupResourceList(): void {
    this.server.setRequestHandler(
      ListResourcesRequestSchema,
      async () => ({
        resources: Object.values(this.resources).map((resource) => ({
          uri: `resource:///${resource.id}`,
          name: resource.name,
          mimeType: "text/plain",
          description: `Resource: ${resource.name}`,
        })),
      })
    );
  }

  private setupResourceRead(): void {
    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        const url = new URL(request.params.uri);
        const id = url.pathname.replace(/^\//, "");
        const resource = this.resources[id];

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
}