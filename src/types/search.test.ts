import { describe, it, expect } from 'vitest';
import { SearchOptions, SearchResult, SearchMode, AttributeMetadata, CancellationToken } from './search';

describe('Search Types', () => {
  describe('SearchOptions', () => {
    it('should have all required properties with correct types', () => {
      const options: SearchOptions = {
        matchCase: false,
        searchPicklists: true,
        searchLookups: false,
        searchAttributes: true,
        searchEntities: false,
        searchRelationships: true,
        searchFormsViews: false,
        alwaysGetLatestSolution: true
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
      expect(partialOptions.searchLookups).toBeUndefined();
    });
  });

  describe('SearchMode', () => {
    it('should only allow valid search modes', () => {
      const validModes: SearchMode[] = ['records', 'metadata', 'solutions'];
      
      expect(validModes).toContain('records');
      expect(validModes).toContain('metadata');
      expect(validModes).toContain('solutions');
    });
  });

  describe('SearchResult', () => {
    it('should create record search result correctly', () => {
      const recordResult: SearchResult = {
        id: 'record-1',
        title: 'Test Account',
        subtitle: 'Account • Active',
        snippet: 'A test account record',
        type: 'record',
        metadata: {
          entityName: 'account',
          recordId: 'test-record-id'
        }
      };

      expect(recordResult.type).toBe('record');
      expect(recordResult.metadata.entityName).toBe('account');
      expect(recordResult.metadata.recordId).toBe('test-record-id');
    });

    it('should create metadata search result correctly', () => {
      const metadataResult: SearchResult = {
        id: 'metadata-1',
        title: 'Account Name',
        subtitle: 'account.name • Attribute',
        snippet: 'Primary name field',
        type: 'attribute',
        metadata: {
          entityName: 'account',
          attributeName: 'name',
          metadataType: 'Attribute',
          schemaName: 'Name'
        }
      };

      expect(metadataResult.type).toBe('attribute');
      expect(metadataResult.metadata.entityName).toBe('account');
      expect(metadataResult.metadata.attributeName).toBe('name');
      expect(metadataResult.metadata.metadataType).toBe('Attribute');
    });

    it('should create solution search result correctly', () => {
      const solutionResult: SearchResult = {
        id: 'solution-1',
        title: 'Custom Solution',
        subtitle: 'Managed Solution',
        snippet: 'Custom business solution',
        type: 'solution',
        metadata: {
          solutionId: 'solution-id',
          uniqueName: 'CustomSolution',
          version: '1.0.0.0',
          publisher: 'Custom Publisher'
        }
      };

      expect(solutionResult.type).toBe('solution');
      expect(solutionResult.metadata.solutionId).toBe('solution-id');
      expect(solutionResult.metadata.uniqueName).toBe('CustomSolution');
      expect(solutionResult.metadata.version).toBe('1.0.0.0');
    });
  });

  describe('AttributeMetadata', () => {
    it('should create string attribute metadata correctly', () => {
      const stringAttribute: AttributeMetadata = {
        LogicalName: 'name',
        AttributeType: 'String',
        IsValidForRead: true,
        IsCustomAttribute: false,
        SchemaName: 'Name',
        DisplayName: {
          UserLocalizedLabel: {
            Label: 'Account Name'
          }
        },
        Description: {
          UserLocalizedLabel: {
            Label: 'The name of the account'
          }
        },
        MaxLength: 200
      };

      expect(stringAttribute.LogicalName).toBe('name');
      expect(stringAttribute.AttributeType).toBe('String');
      expect(stringAttribute.MaxLength).toBe(200);
    });

    it('should create picklist attribute metadata correctly', () => {
      const picklistAttribute: AttributeMetadata = {
        LogicalName: 'statuscode',
        AttributeType: 'Picklist',
        IsValidForRead: true,
        IsCustomAttribute: false,
        SchemaName: 'StatusCode',
        OptionSet: {
          Options: [
            {
              Value: 1,
              Label: {
                UserLocalizedLabel: {
                  Label: 'Active'
                }
              }
            },
            {
              Value: 2,
              Label: {
                UserLocalizedLabel: {
                  Label: 'Inactive'
                }
              }
            }
          ]
        }
      };

      expect(picklistAttribute.LogicalName).toBe('statuscode');
      expect(picklistAttribute.AttributeType).toBe('Picklist');
      expect(picklistAttribute.OptionSet?.Options).toHaveLength(2);
      expect(picklistAttribute.OptionSet?.Options[0].Value).toBe(1);
    });

    it('should create lookup attribute metadata correctly', () => {
      const lookupAttribute: AttributeMetadata = {
        LogicalName: 'parentaccountid',
        AttributeType: 'Lookup',
        IsValidForRead: true,
        IsCustomAttribute: false,
        SchemaName: 'ParentAccountId',
        Targets: ['account']
      };

      expect(lookupAttribute.LogicalName).toBe('parentaccountid');
      expect(lookupAttribute.AttributeType).toBe('Lookup');
      expect(lookupAttribute.Targets).toEqual(['account']);
    });
  });

  describe('CancellationToken', () => {
    it('should create cancellation token correctly', () => {
      let cancelled = false;
      
      const token: CancellationToken = {
        isCancelled: false,
        cancel: () => {
          cancelled = true;
          token.isCancelled = true;
        }
      };

      expect(token.isCancelled).toBe(false);
      expect(cancelled).toBe(false);

      token.cancel();

      expect(token.isCancelled).toBe(true);
      expect(cancelled).toBe(true);
    });
  });

  describe('Type Guards', () => {
    it('should distinguish between different result types', () => {
      const recordResult: SearchResult = {
        id: '1',
        title: 'Test',
        subtitle: 'Test',
        snippet: 'Test',
        type: 'record',
        metadata: { entityName: 'account', recordId: 'id' }
      };

      const metadataResult: SearchResult = {
        id: '2',
        title: 'Test',
        subtitle: 'Test',
        snippet: 'Test',
        type: 'attribute',
        metadata: { entityName: 'account', attributeName: 'name', metadataType: 'Attribute' }
      };

      const solutionResult: SearchResult = {
        id: '3',
        title: 'Test',
        subtitle: 'Test',
        snippet: 'Test',
        type: 'solution',
        metadata: { solutionId: 'id', uniqueName: 'test' }
      };

      // Type checking at runtime
      if (recordResult.type === 'record') {
        expect('recordId' in recordResult.metadata).toBe(true);
      }

      if (metadataResult.type === 'attribute') {
        expect('attributeName' in metadataResult.metadata).toBe(true);
      }

      if (solutionResult.type === 'solution') {
        expect('solutionId' in solutionResult.metadata).toBe(true);
      }
    });
  });

  describe('Interface Completeness', () => {
    it('should ensure all search callbacks are properly typed', () => {
      const callbacks = {
        onProgress: (percentage: number, currentTable: string, estimatedTimeRemaining?: number) => {
          expect(typeof percentage).toBe('number');
          expect(typeof currentTable).toBe('string');
          if (estimatedTimeRemaining !== undefined) {
            expect(typeof estimatedTimeRemaining).toBe('number');
          }
        },
        onResultUpdate: (results: SearchResult[]) => {
          expect(Array.isArray(results)).toBe(true);
        },
        onComplete: () => {
          // Complete callback
        },
        onError: (error: Error) => {
          expect(error).toBeInstanceOf(Error);
        }
      };

      // Test callback signatures
      callbacks.onProgress(50, 'account', 30000);
      callbacks.onProgress(25, 'contact');
      callbacks.onResultUpdate([]);
      callbacks.onComplete();
      callbacks.onError(new Error('Test error'));
    });
  });
});