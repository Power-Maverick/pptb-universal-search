import { SearchOptions, SearchResult, SearchMode, AttributeMetadata, MetadataSearchResult, SearchCallbacks, SearchProgress, SearchCancellation } from '../types/search';

export class UniversalSearchService {
    private searchStartTime: number = 0;
    
    /**
     * Main progressive search function with callbacks
     */
    async searchProgressive(
        searchText: string,
        searchMode: SearchMode,
        selectedEntities: string[],
        selectedSolution: string | null,
        searchOptions: SearchOptions,
        callbacks: SearchCallbacks,
        cancellation: SearchCancellation
    ): Promise<SearchResult[]> {
        this.searchStartTime = Date.now();
        
        const trimmedText = searchText.trim();
        if (!trimmedText) {
            const error = new Error('Search text cannot be empty');
            callbacks.onError?.(error);
            throw error;
        }

        try {
            switch (searchMode) {
                case 'records':
                    return await this.searchRecordsProgressive(trimmedText, selectedEntities, callbacks, cancellation);
                case 'metadata':
                    return await this.searchMetadataProgressive(trimmedText, selectedEntities, searchOptions, callbacks, cancellation);
                case 'solution':
                    return await this.searchSolutionProgressive(selectedSolution, callbacks, cancellation);
                default:
                    throw new Error(`Unsupported search mode: ${searchMode}`);
            }
        } catch (error) {
            callbacks.onError?.(error as Error);
            throw error;
        }
    }

    /**
     * Original search function for backwards compatibility
     */
    async search(
        searchText: string,
        searchMode: SearchMode,
        selectedEntities: string[],
        selectedSolution: string | null,
        searchOptions: SearchOptions
    ): Promise<SearchResult[]> {
        const trimmedText = searchText.trim();
        if (!trimmedText) {
            throw new Error('Search text cannot be empty');
        }

        switch (searchMode) {
            case 'records':
                return await this.searchRecords(trimmedText, selectedEntities);
            case 'metadata':
                return await this.searchMetadata(trimmedText, selectedEntities, searchOptions);
            case 'solution':
                return await this.searchSolution(selectedSolution);
            default:
                throw new Error(`Unsupported search mode: ${searchMode}`);
        }
    }

    /**
     * Search through records in selected entities with progress callbacks
     */
    private async searchRecordsProgressive(
        searchText: string,
        selectedEntities: string[],
        callbacks: SearchCallbacks,
        cancellation: SearchCancellation
    ): Promise<SearchResult[]> {
        if (!selectedEntities || selectedEntities.length === 0) {
            throw new Error('Please select at least one entity to search');
        }

        const results: SearchResult[] = [];
        const sortedEntities = selectedEntities.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        const totalEntities = sortedEntities.length;

        for (let i = 0; i < sortedEntities.length; i++) {
            if (cancellation.isCancelled) {
                break;
            }

            const entityName = sortedEntities[i];
            const progress: SearchProgress = {
                currentEntity: entityName,
                entitiesCompleted: i,
                totalEntities,
                isSearching: true,
                estimatedTimeRemaining: this.calculateEstimatedTimeRemaining(i, totalEntities)
            };

            callbacks.onProgress?.(progress);

            try {
                // Get entity metadata first
                const entityMetadata = await window.dataverseAPI.getEntityMetadata(entityName, true, ['LogicalName', 'DisplayName']);
                if (!entityMetadata) {
                    throw new Error(`Could not retrieve metadata for entity ${entityName}`);
                }
                
                // Get entity attributes using getEntityRelatedMetadata
                const attributesResponse = await window.dataverseAPI.getEntityRelatedMetadata(entityName, 'Attributes');
                if (!attributesResponse || !attributesResponse.value) {
                    console.warn(`No attributes found for entity ${entityName}`);
                    continue;
                }
                
                const attributes = attributesResponse.value;
                if (!Array.isArray(attributes)) {
                    console.warn(`Invalid attributes format for entity ${entityName}`);
                    continue;
                }
                
                // Filter to searchable attributes
                const searchableAttributes = (attributes as AttributeMetadata[]).filter(attr => 
                    attr && 
                    typeof attr === 'object' &&
                    'LogicalName' in attr &&
                    'IsValidForRead' in attr &&
                    'AttributeType' in attr &&
                    attr.LogicalName &&
                    attr.IsValidForRead && 
                    (attr.AttributeType === 'String' || 
                     attr.AttributeType === 'Memo' ||
                     attr.AttributeType === 'Lookup' ||
                     attr.AttributeType === 'Customer' ||
                     attr.AttributeType === 'Owner' ||
                     attr.AttributeType === 'Picklist' ||
                     attr.AttributeType === 'State' ||
                     attr.AttributeType === 'Status' ||
                     attr.AttributeType === 'Integer' ||
                     attr.AttributeType === 'BigInt' ||
                     attr.AttributeType === 'Decimal' ||
                     attr.AttributeType === 'Double' ||
                     attr.AttributeType === 'Money' ||
                     attr.AttributeType === 'DateTime' ||
                     attr.AttributeType === 'Boolean' ||
                     attr.AttributeType === 'Uniqueidentifier')
                );

                if (searchableAttributes.length === 0) {
                    console.warn(`No searchable attributes found for entity ${entityName}`);
                    // Just continue to next entity - don't create error result for UI
                    continue;
                }

                // Build FetchXML query
                let fetchXml: string;
                try {
                    fetchXml = this.buildRecordSearchFetchXml(
                        entityName,
                        searchText,
                        searchableAttributes
                    );
                } catch (fetchError) {
                    console.warn(`Could not build search query for entity ${entityName}:`, fetchError);
                    // Just continue to next entity - don't create error result for UI
                    continue;
                }

                // Execute query
                let response: any;
                try {
                    response = await window.dataverseAPI.fetchXmlQuery(fetchXml);
                } catch (queryError) {
                    console.warn(`Query failed for entity ${entityName}:`, queryError);
                    // Track error for final summary but don't create UI result
                    const errorResult: SearchResult = {
                        id: `records_${entityName}_fetch_error`,
                        entityName,
                        tabTitle: `${entityName} (Fetch Error)`,
                        type: 'records',
                        records: [],
                        totalCount: 0,
                        error: `Failed to execute query for ${entityName}: ${(queryError as Error).message}`
                    };
                    
                    results.push(errorResult);
                    // Don't call onResultUpdate for errors - just track in results for final summary
                    continue;
                }
                
                let records = response?.value || [];

                if (!Array.isArray(records)) {
                    console.warn(`Invalid response format for entity ${entityName}:`, response);
                    records = [];
                }

                // Post-process results
                records = await this.postProcessRecords(records);

                // Only create result if we have records or want to show empty results
                if (records.length > 0) {
                    const recordsWithId = records.map((record: any, index: number) => ({
                        ...record,
                        id: record.id || record[`${entityName}id`] || `record_${index}`
                    }));
                    
                    const result: SearchResult = {
                        id: `records_${entityName}`,
                        entityName,
                        tabTitle: `${entityMetadata.DisplayName?.LocalizedLabels?.[0]?.Label || entityName} (${records.length})`,
                        type: 'records',
                        records: recordsWithId,
                        totalCount: records.length
                    };
                    
                    results.push(result);
                    callbacks.onResultUpdate?.(result);
                }

            } catch (error) {
                console.error(`Error searching entity ${entityName}:`, error);
                // Track error for final summary but don't create UI result
                const errorResult: SearchResult = {
                    id: `records_${entityName}_error`,
                    entityName,
                    tabTitle: `${entityName} (Error)`,
                    type: 'records',
                    records: [],
                    totalCount: 0,
                    error: `Failed to search ${entityName}: ${(error as Error).message}`
                };
                
                results.push(errorResult);
                // Don't call onResultUpdate for errors - just track in results for final summary
            }
        }

        const finalProgress: SearchProgress = {
            currentEntity: '',
            entitiesCompleted: totalEntities,
            totalEntities,
            isSearching: false
        };
        
        callbacks.onProgress?.(finalProgress);
        callbacks.onComplete?.(results);

        return results;
    }

    /**
     * Search through metadata with progress callbacks
     */
    private async searchMetadataProgressive(
        searchText: string,
        selectedEntities: string[],
        searchOptions: SearchOptions,
        callbacks: SearchCallbacks,
        cancellation: SearchCancellation
    ): Promise<SearchResult[]> {
        const results: SearchResult[] = [];
        const searchRegex = this.wildcardToRegex(searchText, searchOptions.matchCase);
        
        // Get entities to search
        let entitiesToSearch = selectedEntities;
        if (!selectedEntities || selectedEntities.length === 0) {
            const allEntities = await window.dataverseAPI.getAllEntitiesMetadata();
            entitiesToSearch = (allEntities?.value || []).map((e: any) => e.LogicalName).filter(Boolean);
        }

        const metadataResults: MetadataSearchResult[] = [];
        const totalEntities = entitiesToSearch.length;

        for (let i = 0; i < entitiesToSearch.length; i++) {
            if (cancellation.isCancelled) {
                break;
            }

            const entityName = entitiesToSearch[i];
            const progress: SearchProgress = {
                currentEntity: entityName,
                entitiesCompleted: i,
                totalEntities,
                isSearching: true,
                estimatedTimeRemaining: this.calculateEstimatedTimeRemaining(i, totalEntities)
            };

            callbacks.onProgress?.(progress);

            try {
                const entityMetadata = await window.dataverseAPI.getEntityMetadata(entityName, false);
                if (!entityMetadata) {
                    continue;
                }
                
                // Search entity names and descriptions
                if (searchOptions.searchEntities) {
                    this.searchEntityMetadata(entityMetadata, searchRegex, metadataResults);
                }

                // Search attributes
                if (searchOptions.searchAttributes) {
                    try {
                        const attributesResponse = await window.dataverseAPI.getEntityRelatedMetadata(entityName, 'Attributes');
                        if (attributesResponse?.value && Array.isArray(attributesResponse.value)) {
                            this.searchAttributeMetadata(entityName, attributesResponse.value, searchRegex, metadataResults);
                        }
                    } catch (attrError) {
                        console.warn(`Could not get attributes for ${entityName}:`, attrError);
                    }
                }

            } catch (error) {
                console.error(`Error searching metadata for ${entityName}:`, error);
            }
        }

        // Group and convert results
        if (metadataResults.length > 0) {
            const groupedResults = metadataResults.reduce((acc, result) => {
                if (!acc[result.entityName]) {
                    acc[result.entityName] = [];
                }
                acc[result.entityName].push(result);
                return acc;
            }, {} as Record<string, MetadataSearchResult[]>);

            for (const [entityName, entityResults] of Object.entries(groupedResults)) {
                const result: SearchResult = {
                    id: `metadata_${entityName}`,
                    entityName,
                    tabTitle: `${entityName} Metadata (${entityResults.length})`,
                    type: 'metadata',
                    records: entityResults.map(r => ({
                        id: `${r.type}_${r.name}`,
                        Type: r.type,
                        Name: r.name,
                        'Display Name': r.displayName || '',
                        'Match Location': r.matchLocation,
                        'Match Value': r.matchValue,
                        Description: r.description || ''
                    })),
                    totalCount: entityResults.length
                };
                
                results.push(result);
                callbacks.onResultUpdate?.(result);
            }
        }

        const finalProgress: SearchProgress = {
            currentEntity: '',
            entitiesCompleted: totalEntities,
            totalEntities,
            isSearching: false
        };
        
        callbacks.onProgress?.(finalProgress);
        callbacks.onComplete?.(results);

        return results;
    }

    /**
     * Search through solution with progress callbacks
     */
    private async searchSolutionProgressive(
        selectedSolution: string | null,
        callbacks: SearchCallbacks,
        cancellation: SearchCancellation
    ): Promise<SearchResult[]> {
        if (!selectedSolution) {
            throw new Error('Please select a solution to search');
        }

        if (cancellation.isCancelled) {
            return [];
        }

        const progress: SearchProgress = {
            currentEntity: selectedSolution,
            entitiesCompleted: 0,
            totalEntities: 1,
            isSearching: true
        };

        callbacks.onProgress?.(progress);

        const result: SearchResult = {
            id: `solution_${selectedSolution}`,
            entityName: selectedSolution,
            tabTitle: `${selectedSolution} (Not Implemented)`,
            type: 'solution',
            records: [],
            totalCount: 0,
            error: 'Solution file search is not yet implemented in this version. This feature requires server-side solution export and file parsing capabilities.'
        };

        callbacks.onResultUpdate?.(result);

        const finalProgress: SearchProgress = {
            currentEntity: '',
            entitiesCompleted: 1,
            totalEntities: 1,
            isSearching: false
        };

        callbacks.onProgress?.(finalProgress);
        callbacks.onComplete?.([result]);

        return [result];
    }

    /**
     * Calculate estimated time remaining based on current progress
     */
    private calculateEstimatedTimeRemaining(completed: number, total: number): number | undefined {
        if (completed === 0 || this.searchStartTime === 0) {
            return undefined;
        }

        const elapsedTime = (Date.now() - this.searchStartTime) / 1000; // in seconds
        const averageTimePerEntity = elapsedTime / completed;
        const remainingEntities = total - completed;
        
        return Math.round(averageTimePerEntity * remainingEntities);
    }

    /**
     * Search through records in selected entities
     */
    private async searchRecords(
        searchText: string,
        selectedEntities: string[]
    ): Promise<SearchResult[]> {
        if (!selectedEntities || selectedEntities.length === 0) {
            throw new Error('Please select at least one entity to search');
        }

        const results: SearchResult[] = [];

        for (const entityName of selectedEntities.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))) {
            try {
                // Get entity metadata first
                const entityMetadata = await window.dataverseAPI.getEntityMetadata(entityName, true, ['LogicalName', 'DisplayName']);
                if (!entityMetadata) {
                    throw new Error(`Could not retrieve metadata for entity ${entityName}`);
                }
                
                // Get entity attributes using getEntityRelatedMetadata
                const attributesResponse = await window.dataverseAPI.getEntityRelatedMetadata(entityName, 'Attributes');
                if (!attributesResponse || !attributesResponse.value) {
                    console.warn(`No attributes found for entity ${entityName}`);
                    continue;
                }
                
                const attributes = attributesResponse.value;
                if (!Array.isArray(attributes)) {
                    console.warn(`Invalid attributes format for entity ${entityName}`);
                    continue;
                }
                
                // Filter to searchable attributes - include all types
                const searchableAttributes = (attributes as AttributeMetadata[]).filter(attr => 
                    attr && 
                    typeof attr === 'object' &&
                    'LogicalName' in attr &&
                    'IsValidForRead' in attr &&
                    'AttributeType' in attr &&
                    attr.LogicalName &&
                    attr.IsValidForRead && 
                    // Include all attribute types that the search supports
                    (attr.AttributeType === 'String' || 
                     attr.AttributeType === 'Memo' ||
                     attr.AttributeType === 'Lookup' ||
                     attr.AttributeType === 'Customer' ||
                     attr.AttributeType === 'Owner' ||
                     attr.AttributeType === 'Picklist' ||
                     attr.AttributeType === 'State' ||
                     attr.AttributeType === 'Status' ||
                     attr.AttributeType === 'Integer' ||
                     attr.AttributeType === 'BigInt' ||
                     attr.AttributeType === 'Decimal' ||
                     attr.AttributeType === 'Double' ||
                     attr.AttributeType === 'Money' ||
                     attr.AttributeType === 'DateTime' ||
                     attr.AttributeType === 'Boolean' ||
                     attr.AttributeType === 'Uniqueidentifier')
                );

                if (searchableAttributes.length === 0) {
                    console.warn(`No searchable attributes found for entity ${entityName}`);
                    continue;
                }

                // Build FetchXML query with OR conditions for all searchable fields
                const fetchXml = this.buildRecordSearchFetchXml(
                    entityName,
                    searchText,
                    searchableAttributes
                );

                // Execute query
                const response = await window.dataverseAPI.fetchXmlQuery(fetchXml);
                let records = response?.value || [];

                // Ensure records is an array
                if (!Array.isArray(records)) {
                    console.warn(`Invalid response format for entity ${entityName}:`, response);
                    records = [];
                }

                // Post-process results to update display values for lookups and option sets
                records = await this.postProcessRecords(records);

                if (records.length > 0) {
                    // Add id to each record for display
                    const recordsWithId = records.map((record: any, index: number) => ({
                        ...record,
                        id: record.id || record[`${entityName}id`] || `record_${index}`
                    }));
                    
                    results.push({
                        id: `records_${entityName}`,
                        entityName,
                        tabTitle: `${entityMetadata.DisplayName?.LocalizedLabels?.[0]?.Label || entityName} (${records.length})`,
                        type: 'records',
                        records: recordsWithId,
                        totalCount: records.length
                    });
                }

            } catch (error) {
                console.error(`Error searching entity ${entityName}:`, error);
                results.push({
                    id: `records_${entityName}_error`,
                    entityName,
                    tabTitle: `${entityName} (Error)`,
                    type: 'records',
                    records: [],
                    totalCount: 0,
                    error: `Failed to search ${entityName}: ${(error as Error).message}`
                });
            }
        }

        return results;
    }

    /**
     * Search through metadata (entities, attributes, relationships, forms, views)
     */
    private async searchMetadata(
        searchText: string,
        selectedEntities: string[],
        searchOptions: SearchOptions
    ): Promise<SearchResult[]> {
        const results: SearchResult[] = [];
        const searchRegex = this.wildcardToRegex(searchText, searchOptions.matchCase);
        
        // Get entities to search - if none selected, search all
        let entitiesToSearch = selectedEntities;
        if (!selectedEntities || selectedEntities.length === 0) {
            const allEntities = await window.dataverseAPI.getAllEntitiesMetadata();
            entitiesToSearch = (allEntities?.value || []).map((e: any) => e.LogicalName).filter(Boolean);
        }

        const metadataResults: MetadataSearchResult[] = [];

        for (const entityName of entitiesToSearch) {
            try {
                const entityMetadata = await window.dataverseAPI.getEntityMetadata(entityName, false);
                if (!entityMetadata) {
                    continue;
                }
                
                // Search entity names and descriptions
                if (searchOptions.searchEntities) {
                    this.searchEntityMetadata(entityMetadata, searchRegex, metadataResults);
                }

                // Search attributes using getEntityRelatedMetadata
                if (searchOptions.searchAttributes) {
                    try {
                        const attributesResponse = await window.dataverseAPI.getEntityRelatedMetadata(entityName, 'Attributes');
                        if (attributesResponse?.value && Array.isArray(attributesResponse.value)) {
                            this.searchAttributeMetadata(entityName, attributesResponse.value, searchRegex, metadataResults);
                        }
                    } catch (attrError) {
                        console.warn(`Could not get attributes for ${entityName}:`, attrError);
                    }
                }

            } catch (error) {
                console.error(`Error searching metadata for ${entityName}:`, error);
            }
        }

        if (metadataResults.length > 0) {
            // Group results by entity
            const groupedResults = metadataResults.reduce((acc, result) => {
                if (!acc[result.entityName]) {
                    acc[result.entityName] = [];
                }
                acc[result.entityName].push(result);
                return acc;
            }, {} as Record<string, MetadataSearchResult[]>);

            // Create SearchResult for each entity
            for (const [entityName, entityResults] of Object.entries(groupedResults)) {
                results.push({
                    id: `metadata_${entityName}`,
                    entityName,
                    tabTitle: `${entityName} Metadata (${entityResults.length})`,
                    type: 'metadata',
                    records: entityResults.map(r => ({
                        id: `${r.type}_${r.name}`,
                        Type: r.type,
                        Name: r.name,
                        'Display Name': r.displayName || '',
                        'Match Location': r.matchLocation,
                        'Match Value': r.matchValue,
                        Description: r.description || ''
                    })),
                    totalCount: entityResults.length
                });
            }
        }

        return results;
    }

    /**
     * Search through solution files
     */
    private async searchSolution(
        selectedSolution: string | null
    ): Promise<SearchResult[]> {
        if (!selectedSolution) {
            throw new Error('Please select a solution to search');
        }

        // For now, return a placeholder - solution search would require 
        // server-side functionality to export and extract solution files
        return [{
            id: `solution_${selectedSolution}`,
            entityName: selectedSolution,
            tabTitle: `${selectedSolution} (Not Implemented)`,
            type: 'solution',
            records: [],
            totalCount: 0,
            error: 'Solution file search is not yet implemented in this version. This feature requires server-side solution export and file parsing capabilities.'
        }];
    }

    /**
     * Build FetchXML query for record search
     */
    private buildRecordSearchFetchXml(
        entityName: string,
        searchText: string,
        attributes: AttributeMetadata[]
    ): string {
        if (!attributes || attributes.length === 0) {
            throw new Error(`No searchable attributes provided for entity ${entityName}`);
        }
        
        const conditions: string[] = [];
        
        // Try to parse as different data types
        const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isGuid = guidRegex.test(searchText);
        const isNumber = !isNaN(Number(searchText));
        const isDate = !isNaN(Date.parse(searchText));
        
        // Build the FetchXML - use all-attributes to avoid request length issues
        
        for (const attr of attributes) { // Include ALL attributes, not just first 20
            if (!attr || !attr.LogicalName) {
                continue;
            }
            
            const attrName = attr.LogicalName;
            
            // Skip system fields that are typically not searchable
            if (attrName.startsWith('createdon') || 
                attrName.startsWith('modifiedon') || 
                attrName.startsWith('versionnumber')) {
                continue;
            }
            
            switch (attr.AttributeType) {
                case 'String':
                case 'Memo':
                    if (searchText.includes('*') || searchText.includes('?')) {
                        // Use like with wildcards
                        const likePattern = searchText.replace(/\*/g, '%').replace(/\?/g, '_');
                        conditions.push(`<condition attribute="${attrName}" operator="like" value="${this.escapeXml(likePattern)}" />`);
                    } else {
                        // Use contains for regular text
                        conditions.push(`<condition attribute="${attrName}" operator="like" value="%${this.escapeXml(searchText)}%" />`);
                    }
                    break;
                    
                case 'Lookup':
                case 'Customer':
                case 'Owner':
                    if (isGuid) {
                        conditions.push(`<condition attribute="${attrName}" operator="eq" value="${searchText}" />`);
                    }
                    break;
                    
                case 'Integer':
                case 'BigInt':
                case 'Decimal':
                case 'Double':
                case 'Money':
                    if (isNumber) {
                        conditions.push(`<condition attribute="${attrName}" operator="eq" value="${searchText}" />`);
                    }
                    break;
                    
                case 'DateTime':
                    if (isDate) {
                        const date = new Date(searchText);
                        const dateStr = date.toISOString().split('T')[0];
                        conditions.push(`<condition attribute="${attrName}" operator="on" value="${dateStr}" />`);
                    }
                    break;
                    
                case 'Boolean':
                    if (searchText.toLowerCase() === 'true' || searchText === '1') {
                        conditions.push(`<condition attribute="${attrName}" operator="eq" value="1" />`);
                    } else if (searchText.toLowerCase() === 'false' || searchText === '0') {
                        conditions.push(`<condition attribute="${attrName}" operator="eq" value="0" />`);
                    }
                    break;
                    
                case 'Picklist':
                case 'State':
                case 'Status':
                    if (isNumber) {
                        conditions.push(`<condition attribute="${attrName}" operator="eq" value="${searchText}" />`);
                    }
                    // TODO: Add option set text search like C# version
                    break;
            }
        }
        
        if (conditions.length === 0) {
            throw new Error(`No searchable conditions could be built for entity ${entityName} with search text "${searchText}"`);
        }
        
        return `
            <fetch top="100">
                <entity name="${entityName}">
                    <all-attributes />
                    <filter type="or">
                        ${conditions.join('')}
                    </filter>
                </entity>
            </fetch>
        `.trim();
    }

    /**
     * Post-process records to resolve lookup names and option set labels
     */
    private async postProcessRecords(
        records: any[]
    ): Promise<any[]> {
        // For now, return records as-is
        // In a full implementation, this would resolve lookup display names
        // and option set labels for better display
        return records;
    }

    /**
     * Search entity metadata
     */
    private searchEntityMetadata(
        entityMetadata: any,
        searchRegex: RegExp,
        results: MetadataSearchResult[]
    ) {
        const entityName = entityMetadata.LogicalName;
        const displayName = entityMetadata.DisplayName?.UserLocalizedLabel?.Label;
        const description = entityMetadata.Description?.UserLocalizedLabel?.Label;
        
        if (searchRegex.test(entityName)) {
            results.push({
                entityName,
                type: 'entity',
                name: entityName,
                displayName,
                description,
                matchLocation: 'Logical Name',
                matchValue: entityName
            });
        }
        
        if (displayName && searchRegex.test(displayName)) {
            results.push({
                entityName,
                type: 'entity',
                name: entityName,
                displayName,
                description,
                matchLocation: 'Display Name',
                matchValue: displayName
            });
        }
        
        if (description && searchRegex.test(description)) {
            results.push({
                entityName,
                type: 'entity',
                name: entityName,
                displayName,
                description,
                matchLocation: 'Description',
                matchValue: description
            });
        }
    }

    /**
     * Search attribute metadata
     */
    private searchAttributeMetadata(
        entityName: string,
        attributes: AttributeMetadata[],
        searchRegex: RegExp,
        results: MetadataSearchResult[]
    ) {
        for (const attr of attributes) {
            if (!attr || !attr.LogicalName) {
                continue;
            }
            
            const displayName = attr.DisplayName?.LocalizedLabels?.[0]?.Label;
            
            if (searchRegex.test(attr.LogicalName)) {
                results.push({
                    entityName,
                    type: 'attribute',
                    name: attr.LogicalName,
                    displayName,
                    description: '',
                    matchLocation: 'Logical Name',
                    matchValue: attr.LogicalName
                });
            }
            
            if (displayName && searchRegex.test(displayName)) {
                results.push({
                    entityName,
                    type: 'attribute',
                    name: attr.LogicalName,
                    displayName,
                    description: '',
                    matchLocation: 'Display Name',
                    matchValue: displayName
                });
            }
        }
    }

    /**
     * Convert wildcard pattern to regex
     */
    private wildcardToRegex(pattern: string, caseSensitive: boolean = false): RegExp {
        const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
        const regexPattern = escaped.replace(/\\\*/g, '.*').replace(/\\\?/g, '.');
        const flags = caseSensitive ? 'g' : 'gi';
        return new RegExp(regexPattern, flags);
    }

    /**
     * Escape XML special characters
     */
    private escapeXml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
}