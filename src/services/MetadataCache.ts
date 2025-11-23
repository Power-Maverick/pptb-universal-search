import { EntityMetadata } from '../types/search';

/**
 * Metadata cache to avoid redundant API calls during search operations
 */
class MetadataCache {
    private entityMetadataCache = new Map<string, EntityMetadata>();
    
    /**
     * Cache entity metadata from the initial entity list load
     */
    cacheEntityMetadata(entities: EntityMetadata[]): void {
        for (const entity of entities) {
            if (entity.LogicalName) {
                this.entityMetadataCache.set(entity.LogicalName, entity);
            }
        }
    }
    
    /**
     * Get cached entity metadata by logical name
     */
    getEntityMetadata(logicalName: string): EntityMetadata | undefined {
        return this.entityMetadataCache.get(logicalName);
    }
    
    /**
     * Get entity display name from cache (with fallback to logical name)
     */
    getEntityDisplayName(logicalName: string): string {
        const metadata = this.entityMetadataCache.get(logicalName);
        
        if (metadata?.DisplayName?.UserLocalizedLabel?.Label) {
            return metadata.DisplayName.UserLocalizedLabel.Label;
        }
        
        if (metadata?.DisplayName?.LocalizedLabels?.[0]?.Label) {
            return metadata.DisplayName.LocalizedLabels[0].Label;
        }
        
        // Fallback to logical name if no display name available
        return logicalName;
    }
    
    /**
     * Check if entity metadata is cached
     */
    hasEntityMetadata(logicalName: string): boolean {
        return this.entityMetadataCache.has(logicalName);
    }
    
    /**
     * Clear the cache
     */
    clear(): void {
        this.entityMetadataCache.clear();
    }
    
    /**
     * Get cache stats for debugging
     */
    getCacheStats(): { size: number; entities: string[] } {
        return {
            size: this.entityMetadataCache.size,
            entities: Array.from(this.entityMetadataCache.keys())
        };
    }
}

// Export a singleton instance
export const metadataCache = new MetadataCache();