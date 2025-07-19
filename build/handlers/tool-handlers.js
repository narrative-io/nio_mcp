import { ListToolsRequestSchema, CallToolRequestSchema, ErrorCode, McpError, } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { ToolRegistry } from "../lib/tool-registry.js";
import { ResourceManager } from "../lib/resource-manager.js";
export class ToolHandlers {
    server;
    apiClient;
    resourceManager;
    constructor(server, apiClient, resources) {
        this.server = server;
        this.apiClient = apiClient;
        this.resourceManager = new ResourceManager(resources);
    }
    setup() {
        this.setupToolsList();
        this.setupToolCalls();
    }
    /**
     * Get the underlying resources for use by ResourceHandlers
     */
    getResources() {
        return this.resourceManager.getAllResources();
    }
    /**
     * Get the resource manager for direct access to SDK-compatible methods
     */
    getResourceManager() {
        return this.resourceManager;
    }
    setupToolsList() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: ToolRegistry.getAllTools(),
        }));
    }
    setupToolCalls() {
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            try {
                // Validate input using ToolRegistry
                const validatedInput = ToolRegistry.validateToolInput(request.params.name, request.params.arguments || {});
                switch (request.params.name) {
                    case "echo":
                        return this.handleEcho(validatedInput);
                    case "search_attributes":
                        return this.handleSearchAttributes(validatedInput);
                    case "list_datasets":
                        return this.handleListDatasets(validatedInput);
                    default:
                        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
                }
            }
            catch (error) {
                if (error instanceof z.ZodError) {
                    throw new McpError(ErrorCode.InvalidParams, `Invalid parameters for tool ${request.params.name}: ${error.message}`);
                }
                throw error;
            }
        });
    }
    async handleEcho(args) {
        // Input is already validated by ToolRegistry, so we can use it directly
        return {
            content: [
                {
                    type: "text",
                    text: `Echo: ${args.message}`,
                },
            ],
        };
    }
    async handleSearchAttributes(args) {
        // Input is already validated and has defaults applied by ToolRegistry
        try {
            const response = await this.apiClient.fetchAttributes(args.query, args.page, args.perPage);
            // Store attributes in memory for resource access using ResourceManager
            this.resourceManager.addAttributesAsResources(response.records);
            // Format the response
            const formattedResults = response.records.map(attr => `- ${attr.display_name} (${attr.name}): ${attr.description.substring(0, 100)}...`).join('\n');
            return {
                content: [
                    {
                        type: "text",
                        text: `Found ${response.total_records} attributes matching "${args.query}"\nPage ${response.current_page} of ${response.total_pages}\n\n${formattedResults}\n\nYou can access full attribute details as resources.`
                    },
                ],
            };
        }
        catch (error) {
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
    async handleListDatasets(_args) {
        try {
            const response = await this.apiClient.fetchDatasets();
            // Store datasets in memory for resource access using ResourceManager
            this.resourceManager.addDatasetsAsResources(response.records);
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
        }
        catch (error) {
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
