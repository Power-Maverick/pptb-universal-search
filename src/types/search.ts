// Types for Universal Search functionality

export type SearchMode = 'records' | 'metadata' | 'solution';

export interface SearchOptions {
    // Common options
    matchCase: boolean;
    
    // Record search options
    searchOptionSetText: boolean;
    searchLookupText: boolean;
    
    // Metadata search options
    searchAttributes: boolean;
    searchEntities: boolean;
    searchRelationships: boolean;
    searchFormsViews: boolean;
    
    // Solution search options
    alwaysGetLatestSolution: boolean;
}

export interface SearchProgress {
    currentEntity: string;
    entitiesCompleted: number;
    totalEntities: number;
    estimatedTimeRemaining?: number;
    isSearching: boolean;
}

export interface SearchCallbacks {
    onProgress?: (progress: SearchProgress) => void;
    onResultUpdate?: (result: SearchResult) => void;
    onComplete?: (allResults: SearchResult[]) => void;
    onError?: (error: Error) => void;
}

export interface SearchCancellation {
    isCancelled: boolean;
    cancel: () => void;
}

export interface SearchResult {
    id: string;
    entityName: string;
    tabTitle: string;
    type: SearchMode;
    records: SearchResultRecord[];
    totalCount: number;
    error?: string;
}

export interface SearchResultRecord {
    id: string;
    [key: string]: any;
}

export interface EntityMetadata {
    LogicalName: string;
    DisplayName?: {
        LocalizedLabels?: {
            Label: string;
            LanguageCode: number;
        }[];
        UserLocalizedLabel?: {
            Label: string;
        };
    };
    SchemaName?: string;
    IsCustomEntity?: boolean;
    IsValidForAdvancedFind?: boolean;
    Attributes?: AttributeMetadata[];
    MetadataId?: string;
}

export interface AttributeMetadata {
    LogicalName: string;
    DisplayName?: {
        LocalizedLabels?: {
            Label: string;
        }[];
    };
    AttributeType?: string;
    IsValidForRead?: boolean;
    IsCustomAttribute?: boolean;
    SchemaName?: string;
}

export interface SolutionInfo {
    UniqueName: string;
    FriendlyName: string;
    Version?: string;
    IsManaged?: boolean;
}

export interface MetadataSearchResult {
    entityName: string;
    type: 'entity' | 'attribute' | 'relationship' | 'form' | 'view';
    name: string;
    displayName?: string;
    description?: string;
    matchLocation: string;
    matchValue: string;
}

export interface SolutionSearchResult {
    fileName: string;
    filePath: string;
    matchLine?: number;
    matchContent: string;
    fileType: string;
}