import type { Resource } from "../types/index.js";

/**
 * Enhanced resource manager with better lifecycle management and utilities
 */
export class ResourceManager {
  private resources: Record<string, Resource> = {};

  constructor(initialResources: Record<string, Resource> = {}) {
    this.resources = { ...initialResources };
  }

  /**
   * Add or update a resource
   */
  setResource(id: string, resource: Resource): void {
    this.resources[id] = resource;
  }

  /**
   * Get a resource by ID
   */
  getResource(id: string): Resource | undefined {
    return this.resources[id];
  }

  /**
   * Get all resources
   */
  getAllResources(): Record<string, Resource> {
    return { ...this.resources };
  }

  /**
   * Remove a resource
   */
  removeResource(id: string): boolean {
    if (id in this.resources) {
      delete this.resources[id];
      return true;
    }
    return false;
  }

  /**
   * Check if a resource exists
   */
  hasResource(id: string): boolean {
    return id in this.resources;
  }

  /**
   * Clear all resources
   */
  clear(): void {
    this.resources = {};
  }

  /**
   * Get resource count
   */
  getResourceCount(): number {
    return Object.keys(this.resources).length;
  }

  /**
   * Add multiple dataset resources from API response
   */
  addDatasetsAsResources(datasets: Array<{ id: string; name: string; [key: string]: any }>): void {
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
  addAttributesAsResources(attributes: Array<{ id: number; display_name: string; [key: string]: any }>): void {
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
  getResourcesByPrefix(prefix: string): Record<string, Resource> {
    const filtered: Record<string, Resource> = {};
    for (const [id, resource] of Object.entries(this.resources)) {
      if (id.startsWith(prefix)) {
        filtered[id] = resource;
      }
    }
    return filtered;
  }
}