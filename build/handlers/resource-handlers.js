import { ListResourcesRequestSchema, ReadResourceRequestSchema, ErrorCode, McpError, } from "@modelcontextprotocol/sdk/types.js";
export class ResourceHandlers {
    server;
    getResourceManager;
    constructor(server, getResourceManager) {
        this.server = server;
        this.getResourceManager = getResourceManager;
    }
    setup() {
        this.setupResourceList();
        this.setupResourceRead();
    }
    setupResourceList() {
        this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
            const resourceManager = this.getResourceManager();
            return {
                resources: resourceManager.getResourcesForList(),
            };
        });
    }
    setupResourceRead() {
        this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
            const url = new URL(request.params.uri);
            const id = url.pathname.replace(/^\//, "");
            const resourceManager = this.getResourceManager();
            const contents = resourceManager.getResourceContents(id, request.params.uri);
            if (!contents) {
                throw new McpError(ErrorCode.InvalidRequest, `Resource ${id} not found`);
            }
            return {
                contents: [contents],
            };
        });
    }
}
