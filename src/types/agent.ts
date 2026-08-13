export type AgentInvocationScope = 'records' | 'metadata' | 'solutionComponents';

export interface AgentInvocationInput {
    query?: string;
    searchTerm?: string;
    scope?: string[];
    entities?: string[];
    maxResults?: number;
    matchCase?: boolean;
    lookupField?: string;
    lookupTargetEntity?: string;
    lookupTargetPrimaryNameField?: string;
}

export interface AgentLookupFilter {
    entityName: string;
    lookupAttribute: string;
    targetEntityName: string;
    targetPrimaryNameAttribute: string;
}

export interface NormalizedAgentInvocationInput {
    query?: string;
    searchTerm: string;
    scope: AgentInvocationScope[];
    entities: string[];
    maxResults: number;
    matchCase: boolean;
    lookupFilter?: AgentLookupFilter;
}

export interface AgentInvocationMatch {
    type: string;
    entityName: string;
    recordId: string;
    displayName: string;
    matchedField: string;
    context: string;
}

export interface AgentInvocationResult {
    totalMatches: number;
    matches: AgentInvocationMatch[];
}

export interface HeadlessInvocationContext {
    toolId?: string;
    toolName?: string;
    invocationMode?: 'one-way' | 'two-way';
    authToken?: string;
    updateProgress?: (percent: number, message: string) => void;
    logger?: {
        info?: (message: string) => void;
        error?: (message: string) => void;
    };
}
