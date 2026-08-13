import { UniversalSearchService } from './services/UniversalSearchService';
import {
    AgentInvocationInput,
    AgentInvocationMatch,
    AgentInvocationResult,
    AgentInvocationScope,
    HeadlessInvocationContext,
    NormalizedAgentInvocationInput
} from './types/agent';
import { SearchCallbacks, SearchCancellation, SearchOptions, SearchResult } from './types/search';

const DEFAULT_MAX_RESULTS = 50;

const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
    matchCase: false,
    searchPicklists: false,
    searchLookups: false,
    searchAttributes: true,
    searchEntities: true,
    searchRelationships: true,
    searchFormsViews: true,
    alwaysGetLatestSolution: false
};

export async function invokeHeadless(
    input: AgentInvocationInput = {},
    context: HeadlessInvocationContext = {}
): Promise<AgentInvocationResult> {
    const normalizedInput = normalizeInput(input);
    const service = new UniversalSearchService();
    const callbacks = createCallbacks(context);
    const cancellation = createCancellation();
    const matches: AgentInvocationMatch[] = [];

    context.logger?.info?.(
        `Starting headless invocation for ${context.toolName ?? 'Universal Search'} with scope ${normalizedInput.scope.join(', ')}`
    );

    if (normalizedInput.scope.includes('records')) {
        context.updateProgress?.(15, 'Searching records');
        const recordResults = normalizedInput.lookupFilter
            ? await service.searchRecordsByLookupText(
                normalizedInput.searchTerm,
                normalizedInput.lookupFilter,
                callbacks,
                cancellation,
                normalizedInput.maxResults
            )
            : await service.searchProgressive(
                normalizedInput.searchTerm,
                'records',
                await resolveEntities(normalizedInput.entities),
                null,
                {
                    ...DEFAULT_SEARCH_OPTIONS,
                    matchCase: normalizedInput.matchCase
                },
                callbacks,
                cancellation,
                normalizedInput.maxResults
            );

        matches.push(...flattenSearchResults(
            recordResults,
            normalizedInput.searchTerm,
            normalizedInput.matchCase,
            normalizedInput.lookupFilter
                ? {
                    matchedField: normalizedInput.lookupFilter.lookupAttribute,
                    context: `${normalizedInput.lookupFilter.targetEntityName}.${normalizedInput.lookupFilter.targetPrimaryNameAttribute} contains ${normalizedInput.searchTerm}`
                }
                : undefined
        ));
    }

    if (matches.length < normalizedInput.maxResults && (normalizedInput.scope.includes('metadata') || normalizedInput.scope.includes('solutionComponents'))) {
        context.updateProgress?.(65, 'Searching solution components');
        const metadataResults = await service.searchProgressive(
            normalizedInput.searchTerm,
            'metadata',
            normalizedInput.entities,
            null,
            {
                ...DEFAULT_SEARCH_OPTIONS,
                matchCase: normalizedInput.matchCase
            },
            callbacks,
            cancellation,
            normalizedInput.maxResults - matches.length
        );

        matches.push(...flattenSearchResults(metadataResults, normalizedInput.searchTerm, normalizedInput.matchCase));
    }

    const limitedMatches = deduplicateMatches(matches).slice(0, normalizedInput.maxResults);
    context.updateProgress?.(100, 'Search complete');

    return {
        totalMatches: limitedMatches.length,
        matches: limitedMatches
    };
}

export function normalizeInput(input: AgentInvocationInput): NormalizedAgentInvocationInput {
    const query = typeof input.query === 'string' ? input.query.trim() : '';
    const searchTerm = typeof input.searchTerm === 'string' && input.searchTerm.trim()
        ? input.searchTerm.trim()
        : extractQuotedText(query);

    if (!searchTerm) {
        throw new Error('A searchTerm or quoted query value is required for headless invocation.');
    }

    const scope = normalizeScope(input.scope, query);
    const entities = normalizeEntities(input.entities, query, scope);
    const maxResults = normalizeMaxResults(input.maxResults);
    const matchCase = input.matchCase === true;
    const lookupFilter = buildLookupFilter(input, query, entities);

    return {
        query: query || undefined,
        searchTerm,
        scope,
        entities,
        maxResults,
        matchCase,
        lookupFilter
    };
}

function normalizeScope(scope: string[] | undefined, query: string): AgentInvocationScope[] {
    const validScope = new Set<AgentInvocationScope>(['records', 'metadata', 'solutionComponents']);
    const normalizedScope = Array.isArray(scope)
        ? scope.filter((value): value is AgentInvocationScope => validScope.has(value as AgentInvocationScope))
        : [];

    if (normalizedScope.length > 0) {
        return normalizedScope;
    }

    const queryScope: AgentInvocationScope[] = [];
    if (/solution components?/i.test(query)) {
        queryScope.push('solutionComponents');
    }
    if (/metadata/i.test(query)) {
        queryScope.push('metadata');
    }
    if (/records?/i.test(query) || queryScope.length === 0) {
        queryScope.unshift('records');
    }

    return Array.from(new Set(queryScope));
}

function normalizeEntities(
    entities: string[] | undefined,
    query: string,
    scope: AgentInvocationScope[]
): string[] {
    const normalizedEntities = Array.isArray(entities)
        ? entities.map(entity => entity.trim()).filter(Boolean)
        : [];

    if (normalizedEntities.length > 0) {
        return normalizedEntities;
    }

    const queryEntity = query.match(/\b(?:every|all)\s+([a-z][a-z0-9_]+)/i)?.[1]?.toLowerCase();
    if (queryEntity) {
        return [queryEntity];
    }

    if (scope.length === 1 && scope[0] === 'solutionComponents') {
        return [];
    }

    return [];
}

function normalizeMaxResults(maxResults: number | undefined): number {
    if (typeof maxResults !== 'number' || Number.isNaN(maxResults)) {
        return DEFAULT_MAX_RESULTS;
    }

    return Math.max(1, Math.min(Math.floor(maxResults), 200));
}

function extractQuotedText(query: string): string {
    const match = query.match(/['"]([^'"]+)['"]/);
    return match?.[1]?.trim() ?? '';
}

function buildLookupFilter(input: AgentInvocationInput, query: string, entities: string[]) {
    if (input.lookupField && input.lookupTargetEntity) {
        return {
            entityName: entities[0] || 'account',
            lookupAttribute: input.lookupField,
            targetEntityName: input.lookupTargetEntity,
            targetPrimaryNameAttribute: input.lookupTargetPrimaryNameField || 'fullname'
        };
    }

    if (!/primary contact/i.test(query)) {
        return undefined;
    }

    const targetEntity = entities[0];
    if (targetEntity !== 'account') {
        return undefined;
    }

    return {
        entityName: 'account',
        lookupAttribute: 'primarycontactid',
        targetEntityName: 'contact',
        targetPrimaryNameAttribute: 'fullname'
    };
}

async function resolveEntities(entities: string[]): Promise<string[]> {
    if (entities.length > 0) {
        return entities;
    }

    const allEntities = await window.dataverseAPI.getAllEntitiesMetadata();
    return (allEntities?.value || [])
        .map((entity: any) => entity?.LogicalName)
        .filter((entityName: unknown): entityName is string => typeof entityName === 'string' && entityName.length > 0);
}

function createCallbacks(context: HeadlessInvocationContext): SearchCallbacks {
    return {
        onError: (error) => context.logger?.error?.(error.message)
    };
}

function createCancellation(): SearchCancellation {
    return {
        isCancelled: false,
        cancel() {
            this.isCancelled = true;
        }
    };
}

function flattenSearchResults(
    results: SearchResult[],
    searchTerm: string,
    matchCase: boolean,
    overrideContext?: { matchedField: string; context: string }
): AgentInvocationMatch[] {
    return results.flatMap((result) =>
        result.records.map((record) => mapRecordToMatch(result, record, searchTerm, matchCase, overrideContext))
    );
}

function mapRecordToMatch(
    result: SearchResult,
    record: Record<string, unknown>,
    searchTerm: string,
    matchCase: boolean,
    overrideContext?: { matchedField: string; context: string }
): AgentInvocationMatch {
    const displayName = getDisplayName(record, result.entityName);
    const { matchedField, context } = overrideContext ?? getMatchContext(record, searchTerm, matchCase, result.type);

    return {
        type: result.type,
        entityName: result.entityName,
        recordId: getRecordId(record, result.entityName),
        displayName,
        matchedField,
        context
    };
}

function getDisplayName(record: Record<string, unknown>, entityName: string): string {
    const preferredFields = ['name', 'fullname', 'subject', 'title', 'Name', 'Display Name'];
    for (const field of preferredFields) {
        const value = record[field];
        if (typeof value === 'string' && value.trim()) {
            return value;
        }
    }

    const firstTextValue = Object.values(record).find((value) => typeof value === 'string' && value.trim());
    return typeof firstTextValue === 'string' ? firstTextValue : entityName;
}

function getRecordId(record: Record<string, unknown>, entityName: string): string {
    const explicitId = record.id;
    if (typeof explicitId === 'string' && explicitId) {
        return explicitId;
    }

    const entityId = record[`${entityName}id`];
    return typeof entityId === 'string' ? entityId : '';
}

function getMatchContext(
    record: Record<string, unknown>,
    searchTerm: string,
    matchCase: boolean,
    fallbackField: string
): { matchedField: string; context: string } {
    const normalizedSearchTerm = matchCase ? searchTerm : searchTerm.toLowerCase();

    for (const [field, value] of Object.entries(record)) {
        if (field === 'id' || value == null) {
            continue;
        }

        const textValue = typeof value === 'string' ? value : JSON.stringify(value);
        const comparableValue = matchCase ? textValue : textValue.toLowerCase();
        if (comparableValue.includes(normalizedSearchTerm)) {
            return {
                matchedField: field,
                context: textValue
            };
        }
    }

    return {
        matchedField: fallbackField,
        context: typeof record.Description === 'string' ? record.Description : displayFallbackContext(record)
    };
}

function displayFallbackContext(record: Record<string, unknown>): string {
    const firstValue = Object.values(record).find((value) => value != null);
    if (typeof firstValue === 'string') {
        return firstValue;
    }

    if (typeof firstValue === 'number' || typeof firstValue === 'boolean') {
        return String(firstValue);
    }

    return '';
}

function deduplicateMatches(matches: AgentInvocationMatch[]): AgentInvocationMatch[] {
    const seen = new Set<string>();
    return matches.filter((match) => {
        const key = [
            match.type,
            match.entityName,
            match.recordId,
            match.displayName,
            match.matchedField,
            match.context
        ].join('::');

        if (seen.has(key)) {
            return false;
        }

        seen.add(key);
        return true;
    });
}
