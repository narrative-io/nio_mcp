import { ListResourcesRequestSchema, ReadResourceRequestSchema, ErrorCode, McpError, } from "@modelcontextprotocol/sdk/types.js";
export class ResourceHandlers {
    server;
    getResources;
    constructor(server, getResources) {
        this.server = server;
        this.getResources = getResources;
    }
    setup() {
        this.setupResourceList();
        this.setupResourceRead();
    }
    setupResourceList() {
        this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
            const resources = this.getResources();
            return {
                resources: Object.values(resources).map((resource) => ({
                    uri: `resource:///${resource.id}`,
                    name: resource.name,
                    mimeType: "text/plain",
                    description: `Resource: ${resource.name}`,
                })),
            };
        });
    }
    setupResourceRead() {
        this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
            const url = new URL(request.params.uri);
            const id = url.pathname.replace(/^\//, "");
            const resources = this.getResources();
            const resource = resources[id];
            if (!resource) {
                throw new McpError(ErrorCode.InvalidRequest, `Resource ${id} not found`);
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
        });
    }
}
