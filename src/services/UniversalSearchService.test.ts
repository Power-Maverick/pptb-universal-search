import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UniversalSearchService } from './UniversalSearchService';
import { mockDataverseAPI } from '../test/setup';
import { SearchOptions, AttributeMetadata } from '../types/search';
import { metadataCache } from './MetadataCache';

describe('UniversalSearchService', () => {
  let service: UniversalSearchService;
  
  const defaultSearchOptions: SearchOptions = {
    matchCase: false,
    searchPicklists: false,
    searchLookups: false,
    searchAttributes: true,
    searchEntities: true,
    searchRelationships: false,
    searchFormsViews: false,
    alwaysGetLatestSolution: false
  };

  beforeEach(() => {
    service = new UniversalSearchService();
    metadataCache.clear();
    vi.clearAllMocks();
  });

  describe('Wildcard to Regex Conversion', () => {
    it('should convert wildcards correctly (case insensitive)', () => {
      const regex = (service as any).wildcardToRegex('test*', false);
      expect(regex.test('testing')).toBe(true);
      expect(regex.test('TESTING')).toBe(true);
      expect(regex.test('test123')).toBe(true);
      expect(regex.test('nottest')).toBe(true); // This should match because 'test' substring is found
    });

    it('should convert wildcards correctly (case sensitive)', () => {
      const regex = (service as any).wildcardToRegex('Test*', true);
      expect(regex.test('Testing')).toBe(true);
      expect(regex.test('testing')).toBe(false);
      expect(regex.test('TESTING')).toBe(false);
    });

    it('should handle question mark wildcards', () => {
      const regex = (service as any).wildcardToRegex('te?t', false);
      expect(regex.test('test')).toBe(true);
      expect(regex.test('text')).toBe(true);
      expect(regex.test('tent')).toBe(true);
      expect(regex.test('teat')).toBe(true);
      expect(regex.test('tet')).toBe(false);
      expect(regex.test('teest')).toBe(false);
    });

    it('should escape special regex characters', () => {
      const regex = (service as any).wildcardToRegex('test.+()', false);
      expect(regex.test('test.+()')).toBe(true);
      expect(regex.test('testXXXX')).toBe(false);
    });
  });

  describe('XML Escaping', () => {
    it('should escape XML special characters', () => {
      const escaped = (service as any).escapeXml('&<>"\'');
      expect(escaped).toBe('&amp;&lt;&gt;&quot;&apos;');
    });

    it('should handle normal text without special characters', () => {
      const escaped = (service as any).escapeXml('normal text');
      expect(escaped).toBe('normal text');
    });
  });

  describe('FetchXML Building', () => {
    const mockAttributes: AttributeMetadata[] = [
      {
        LogicalName: 'name',
        AttributeType: 'String',
        IsValidForRead: true,
        IsCustomAttribute: false,
        SchemaName: 'Name'
      },
      {
        LogicalName: 'emailaddress1',
        AttributeType: 'String',
        IsValidForRead: true,
        IsCustomAttribute: false,
        SchemaName: 'EMailAddress1'
      },
      {
        LogicalName: 'statuscode',
        AttributeType: 'Picklist',
        IsValidForRead: true,
        IsCustomAttribute: false,
        SchemaName: 'StatusCode'
      }
    ];

    it('should build basic string search FetchXML', async () => {
      const fetchXml = await (service as any).buildRecordSearchFetchXml(
        'account',
        'test company',
        mockAttributes,
        defaultSearchOptions
      );

      expect(fetchXml).toContain('<entity name=\"account\">');
      expect(fetchXml).toContain('<all-attributes />');
      expect(fetchXml).toContain('<filter type=\"or\">');
      expect(fetchXml).toContain('attribute=\"name\"');
      expect(fetchXml).toContain('operator=\"like\"');
      expect(fetchXml).toContain('value=\"%test company%\"');
    });

    it('should build wildcard search FetchXML', async () => {
      const fetchXml = await (service as any).buildRecordSearchFetchXml(
        'account',
        'test*',
        mockAttributes,
        defaultSearchOptions
      );

      expect(fetchXml).toContain('operator=\"like\"');
      expect(fetchXml).toContain('value=\"test%\"');
    });

    it('should handle numeric searches for integer fields', async () => {
      const numericAttributes: AttributeMetadata[] = [{
        LogicalName: 'revenue',
        AttributeType: 'Money',
        IsValidForRead: true,
        IsCustomAttribute: false,
        SchemaName: 'Revenue'
      }];

      const fetchXml = await (service as any).buildRecordSearchFetchXml(
        'account',
        '1000000',
        numericAttributes,
        defaultSearchOptions
      );

      expect(fetchXml).toContain('attribute=\"revenue\"');
      expect(fetchXml).toContain('operator=\"eq\"');
      expect(fetchXml).toContain('value=\"1000000\"');
    });

    it('should handle boolean searches', async () => {
      const booleanAttributes: AttributeMetadata[] = [{
        LogicalName: 'donotemail',
        AttributeType: 'Boolean',
        IsValidForRead: true,
        IsCustomAttribute: false,
        SchemaName: 'DoNotEmail'
      }];

      const fetchXmlTrue = await (service as any).buildRecordSearchFetchXml(
        'contact',
        'true',
        booleanAttributes,
        defaultSearchOptions
      );

      expect(fetchXmlTrue).toContain('value=\"1\"');

      const fetchXmlFalse = await (service as any).buildRecordSearchFetchXml(
        'contact',
        'false',
        booleanAttributes,
        defaultSearchOptions
      );

      expect(fetchXmlFalse).toContain('value=\"0\"');
    });

    it('should throw error when no searchable conditions can be built', async () => {
      const unsearchableAttributes: AttributeMetadata[] = [{
        LogicalName: 'createdon',
        AttributeType: 'DateTime',
        IsValidForRead: true,
        IsCustomAttribute: false,
        SchemaName: 'CreatedOn'
      }];

      await expect(
        (service as any).buildRecordSearchFetchXml(
          'account',
          'invalid search',
          unsearchableAttributes,
          defaultSearchOptions
        )
      ).rejects.toThrow('No searchable conditions could be built');
    });
  });

  describe('Picklist Search Options', () => {
    beforeEach(() => {
      const mockPicklistResponse = {
        value: [
          {
            LogicalName: 'statuscode',
            GlobalOptionSet: {
              Options: [
                {
                  Value: 1,
                  Label: {
                    UserLocalizedLabel: { Label: 'Active' }
                  }
                },
                {
                  Value: 2,
                  Label: {
                    UserLocalizedLabel: { Label: 'Inactive' }
                  }
                }
              ]
            }
          },
          {
            LogicalName: 'preferredcontactmethodcode',
            OptionSet: {
              Options: [
                {
                  Value: 1,
                  Label: {
                    UserLocalizedLabel: { Label: 'Any' }
                  }
                },
                {
                  Value: 2,
                  Label: {
                    UserLocalizedLabel: { Label: 'Email' }
                  }
                },
                {
                  Value: 3,
                  Label: {
                    UserLocalizedLabel: { Label: 'Phone' }
                  }
                }
              ]
            }
          }
        ]
      };
      
      mockDataverseAPI.queryData.mockResolvedValue(mockPicklistResponse);
    });

    it('should find matching picklist options by label', async () => {
      const optionValues = await (service as any).searchPicklistOptions(
        'contact',
        'preferredcontactmethodcode',
        'Email',
        false
      );

      expect(optionValues).toEqual([2]);
      expect(mockDataverseAPI.queryData).toHaveBeenCalledWith(
        "EntityDefinitions(LogicalName='contact')/Attributes/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$select=LogicalName&$expand=GlobalOptionSet($select=Options)"
      );
    });

    it('should handle wildcard searches in picklist options', async () => {
      const optionValues = await (service as any).searchPicklistOptions(
        'contact',
        'statuscode',
        '*ctive',
        false
      );

      expect(optionValues).toEqual([1, 2]); // Both "Active" and "Inactive" match *ctive pattern
    });

    it('should handle case sensitive searches', async () => {
      const optionValues = await (service as any).searchPicklistOptions(
        'contact',
        'preferredcontactmethodcode',
        'email',
        true // case sensitive
      );

      expect(optionValues).toEqual([]); // "email" doesn't match "Email" when case sensitive
    });

    it('should use cached picklist metadata', async () => {
      // First call should hit API
      await (service as any).searchPicklistOptions('contact', 'statuscode', 'Active', false);
      expect(mockDataverseAPI.queryData).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await (service as any).searchPicklistOptions('contact', 'statuscode', 'Inactive', false);
      expect(mockDataverseAPI.queryData).toHaveBeenCalledTimes(1); // Still only 1 call
    });

    it('should handle missing attributes gracefully', async () => {
      const optionValues = await (service as any).searchPicklistOptions(
        'contact',
        'nonexistentfield',
        'test',
        false
      );

      expect(optionValues).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      mockDataverseAPI.queryData.mockRejectedValue(new Error('API Error'));

      const optionValues = await (service as any).searchPicklistOptions(
        'contact',
        'statuscode',
        'Active',
        false
      );

      expect(optionValues).toEqual([]);
    });
  });

  describe('Search Progress Calculation', () => {
    it('should calculate estimated time remaining', () => {
      (service as any).searchStartTime = Date.now() - 10000; // 10 seconds ago
      
      const timeRemaining = (service as any).calculateEstimatedTimeRemaining(2, 10);
      
      expect(timeRemaining).toBeGreaterThan(0);
      expect(typeof timeRemaining).toBe('number');
    });

    it('should return undefined when no progress made yet', () => {
      const timeRemaining = (service as any).calculateEstimatedTimeRemaining(0, 10);
      expect(timeRemaining).toBeUndefined();
    });

    it('should return undefined when search start time not set', () => {
      (service as any).searchStartTime = 0;
      const timeRemaining = (service as any).calculateEstimatedTimeRemaining(2, 10);
      expect(timeRemaining).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle empty search text', async () => {
      const callbacks = {
        onError: vi.fn(),
        onProgress: vi.fn(),
        onResultUpdate: vi.fn(),
        onComplete: vi.fn()
      };

      const cancellation = { isCancelled: false, cancel: () => {} };

      await expect(
        service.searchProgressive('', 'records', ['account'], null, defaultSearchOptions, callbacks, cancellation)
      ).rejects.toThrow('Search text cannot be empty');

      expect(callbacks.onError).toHaveBeenCalled();
    });

    it('should handle unsupported search mode', async () => {
      const callbacks = {
        onError: vi.fn(),
        onProgress: vi.fn(),
        onResultUpdate: vi.fn(),
        onComplete: vi.fn()
      };

      const cancellation = { isCancelled: false, cancel: () => {} };

      await expect(
        service.searchProgressive('test', 'invalid' as any, ['account'], null, defaultSearchOptions, callbacks, cancellation)
      ).rejects.toThrow('Unsupported search mode: invalid');
    });
  });

  describe('Metadata Type Mapping', () => {
    it('should map metadata types correctly', () => {
      expect((service as any).mapMetadataType('Attribute')).toBe('attribute');
      expect((service as any).mapMetadataType('Relationship')).toBe('relationship');
      expect((service as any).mapMetadataType('Form')).toBe('form');
      expect((service as any).mapMetadataType('View')).toBe('view');
      expect((service as any).mapMetadataType('Entity')).toBe('entity');
      expect((service as any).mapMetadataType('Unknown')).toBe('entity'); // default
    });
  });

  describe('Snippet Extraction', () => {
    it('should extract snippet around match', () => {
      const text = 'This is a very long text that needs to be truncated for display purposes';
      const snippet = (service as any).extractSnippet(text, 10, 20);
      
      expect(snippet.length).toBeLessThanOrEqual(40); // 20 before + 20 after
      expect(snippet).toContain('very');
    });

    it('should add ellipsis when truncating', () => {
      const text = 'This is a very long text that needs to be truncated for display purposes';
      const snippet = (service as any).extractSnippet(text, 30, 10);
      
      expect(snippet).toContain('...');
    });
  });
});