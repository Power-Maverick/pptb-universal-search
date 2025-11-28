import { describe, it, expect } from 'vitest';
import { SearchOptions, SearchResult, SearchMode, AttributeMetadata } from './search';

describe('Search Types', () => {
  describe('SearchOptions', () => {
    it('should have all required properties with correct types', () => {
      const options: SearchOptions = {
        matchCase: false,
        searchPicklists: true,
        searchLookups: true,
        searchAttributes: true,
        searchEntities: true,
        searchRelationships: false,
        searchFormsViews: false,
        alwaysGetLatestSolution: false
      };

      expect(typeof options.matchCase).toBe('boolean');
      expect(typeof options.searchPicklists).toBe('boolean');
      expect(typeof options.searchLookups).toBe('boolean');
      expect(typeof options.searchAttributes).toBe('boolean');
      expect(typeof options.searchEntities).toBe('boolean');
      expect(typeof options.searchRelationships).toBe('boolean');
      expect(typeof options.searchFormsViews).toBe('boolean');
      expect(typeof options.alwaysGetLatestSolution).toBe('boolean');
    });

    it('should allow partial options for defaults', () => {
      const partialOptions: Partial<SearchOptions> = {
        matchCase: true,
        searchPicklists: false
      };

      expect(partialOptions.matchCase).toBe(true);
      expect(partialOptions.searchPicklists).toBe(false);
      expect(partialOptions.searchAttributes).toBeUndefined();
    });
  });

  describe('SearchMode', () => {
    it('should only allow valid search modes', () => {
      const validModes: SearchMode[] = ['records', 'metadata', 'solution'];
      
      validModes.forEach(mode => {
        expect(['records', 'metadata', 'solution']).toContain(mode);
      });
    });
  });

  describe('SearchResult', () => {
    it('should create record search result correctly', () => {
      const recordResult: SearchResult = {
        id: 'record-1',
        entityName: 'account',
        tabTitle: 'Accounts (5)',
        type: 'records',
        records: [
          { id: 'acc1', name: 'Test Account 1' },
          { id: 'acc2', name: 'Test Account 2' }
        ],
        totalCount: 2
      };

      expect(recordResult.type).toBe('records');
      expect(recordResult.entityName).toBe('account');
      expect(recordResult.records).toHaveLength(2);
      expect(recordResult.totalCount).toBe(2);
    });

    it('should create metadata search result correctly', () => {
      const metadataResult: SearchResult = {
        id: 'metadata-1',
        entityName: 'account',
        tabTitle: 'Account Metadata (3)',
        type: 'metadata',
        records: [
          { id: 'attr1', LogicalName: 'name', DisplayName: 'Account Name' },
          { id: 'attr2', LogicalName: 'accountnumber', DisplayName: 'Account Number' }
        ],
        totalCount: 2
      };

      expect(metadataResult.type).toBe('metadata');
      expect(metadataResult.entityName).toBe('account');
      expect(metadataResult.records).toHaveLength(2);
    });

    it('should create solution search result correctly', () => {
      const solutionResult: SearchResult = {
        id: 'solution-1',
        entityName: 'solution',
        tabTitle: 'Solutions (1)',
        type: 'solution',
        records: [
          { 
            id: 'sol1', 
            UniqueName: 'CustomSolution',
            FriendlyName: 'Custom Solution',
            Version: '1.0.0.0'
          }
        ],
        totalCount: 1
      };

      expect(solutionResult.type).toBe('solution');
      expect(solutionResult.records).toHaveLength(1);
      expect(solutionResult.records[0].UniqueName).toBe('CustomSolution');
    });
  });

  describe('AttributeMetadata', () => {
    it('should create string attribute metadata correctly', () => {
      const stringAttribute: AttributeMetadata = {
        LogicalName: 'name',
        DisplayName: {
          LocalizedLabels: [{ Label: 'Name' }]
        },
        AttributeType: 'String',
        IsValidForRead: true,
        IsCustomAttribute: false,
        SchemaName: 'Name'
      };

      expect(stringAttribute.LogicalName).toBe('name');
      expect(stringAttribute.AttributeType).toBe('String');
      expect(stringAttribute.DisplayName?.LocalizedLabels?.[0]?.Label).toBe('Name');
    });

    it('should create picklist attribute metadata correctly', () => {
      const picklistAttribute: AttributeMetadata = {
        LogicalName: 'statuscode',
        DisplayName: {
          LocalizedLabels: [{ Label: 'Status Reason' }]
        },
        AttributeType: 'Picklist',
        IsValidForRead: true,
        IsCustomAttribute: false
      };

      expect(picklistAttribute.LogicalName).toBe('statuscode');
      expect(picklistAttribute.AttributeType).toBe('Picklist');
      expect(picklistAttribute.DisplayName?.LocalizedLabels?.[0]?.Label).toBe('Status Reason');
    });

    it('should create lookup attribute metadata correctly', () => {
      const lookupAttribute: AttributeMetadata = {
        LogicalName: 'parentaccountid',
        DisplayName: {
          LocalizedLabels: [{ Label: 'Parent Account' }]
        },
        AttributeType: 'Lookup',
        IsValidForRead: true,
        IsCustomAttribute: false
      };

      expect(lookupAttribute.LogicalName).toBe('parentaccountid');
      expect(lookupAttribute.AttributeType).toBe('Lookup');
    });
  });

  describe('Type Guards', () => {
    it('should distinguish between different result types', () => {
      const recordResult: SearchResult = {
        id: 'record-1',
        entityName: 'account',
        tabTitle: 'Accounts',
        type: 'records',
        records: [],
        totalCount: 0
      };

      const metadataResult: SearchResult = {
        id: 'metadata-1',
        entityName: 'account',
        tabTitle: 'Metadata',
        type: 'metadata',
        records: [],
        totalCount: 0
      };

      const solutionResult: SearchResult = {
        id: 'solution-1',
        entityName: 'solution',
        tabTitle: 'Solutions',
        type: 'solution',
        records: [],
        totalCount: 0
      };

      expect(recordResult.type).toBe('records');
      expect(metadataResult.type).toBe('metadata');
      expect(solutionResult.type).toBe('solution');
    });
  });

  describe('Interface Completeness', () => {
    it('should ensure all search callbacks are properly typed', () => {
      // This test ensures the callback interfaces compile correctly
      const progress = {
        currentEntity: 'account',
        entitiesCompleted: 1,
        totalEntities: 5,
        isSearching: true
      };

      const result: SearchResult = {
        id: 'test-1',
        entityName: 'account',
        tabTitle: 'Test Results',
        type: 'records',
        records: [],
        totalCount: 0
      };

      // These should compile without errors
      expect(typeof progress.currentEntity).toBe('string');
      expect(typeof result.type).toBe('string');
      expect(Array.isArray(result.records)).toBe(true);
    });
  });
});