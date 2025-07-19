/**
 * Enhanced resource manager with better lifecycle management and utilities
 */
export class ResourceManager {
    resources = {};
    constructor(initialResources = {}) {
        this.resources = { ...initialResources };
    }
    /**
     * Add or update a resource
     */
    setResource(id, resource) {
        this.resources[id] = resource;
    }
    /**
     * Get a resource by ID
     */
    getResource(id) {
        return this.resources[id];
    }
    /**
     * Get all resources
     */
    getAllResources() {
        return { ...this.resources };
    }
    /**
     * Remove a resource
     */
    removeResource(id) {
        if (id in this.resources) {
            delete this.resources[id];
            return true;
        }
        return false;
    }
    /**
     * Check if a resource exists
     */
    hasResource(id) {
        return id in this.resources;
    }
    /**
     * Clear all resources
     */
    clear() {
        this.resources = {};
    }
    /**
     * Get resource count
     */
    getResourceCount() {
        return Object.keys(this.resources).length;
    }
    /**
     * Add multiple dataset resources from API response
     */
    addDatasetsAsResources(datasets) {
        for (const dataset of datasets) {
            this.setResource(`dataset-${dataset.id}`, {
                id: `dataset-${dataset.id}`,
                name: dataset.name,
                content: JSON.stringify(dataset, null, 2),
            });
        }
    }
    /**
     * Add multiple attribute resources from API response
     */
    addAttributesAsResources(attributes) {
        for (const attr of attributes) {
            this.setResource(`attr-${attr.id}`, {
                id: `attr-${attr.id}`,
                name: attr.display_name,
                content: JSON.stringify(attr, null, 2),
            });
        }
    }
    /**
     * Get resources by prefix (e.g., all dataset resources)
     */
    getResourcesByPrefix(prefix) {
        const filtered = {};
        for (const [id, resource] of Object.entries(this.resources)) {
            if (id.startsWith(prefix)) {
                filtered[id] = resource;
            }
        }
        return filtered;
    }
}
