import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import type { StoredResource } from "../types/index.js";
import type { ResourceManager } from "../lib/resource-manager.js";

export class ResourceHandlers {
  constructor(
    private server: Server,
    private getResourceManager: () => ResourceManager
  ) {}

  setup(): void {
    this.setupResourceList();
    this.setupResourceRead();
  }

  private setupResourceList(): void {
    this.server.setRequestHandler(
      ListResourcesRequestSchema,
      async () => {
        const resourceManager = this.getResourceManager();
        return {
          resources: resourceManager.getResourcesForList(),
        };
      }
    );
  }

  private setupResourceRead(): void {
    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        const url = new URL(request.params.uri);
        const id = url.pathname.replace(/^\//, "");
        const resourceManager = this.getResourceManager();
        const contents = resourceManager.getResourceContents(id, request.params.uri);

        if (!contents) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Resource ${id} not found`
          );
        }

        return {
          contents: [contents],
        };
      }
    );
  }
}