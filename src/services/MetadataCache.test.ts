import { describe, it, expect, beforeEach } from 'vitest';
import { metadataCache } from '../services/MetadataCache';
import { EntityMetadata } from '../types/search';

describe('MetadataCache', () => {
  beforeEach(() => {
    // Clear cache before each test
    metadataCache.clear();
  });

  describe('Entity Metadata Caching', () => {
    const mockEntities: EntityMetadata[] = [
      {
        LogicalName: 'account',
        DisplayName: {
          UserLocalizedLabel: { Label: 'Account' },
          LocalizedLabels: [{ Label: 'Account', LanguageCode: 1033 }]
        },
        SchemaName: 'Account'
      },
      {
        LogicalName: 'contact',
        DisplayName: {
          LocalizedLabels: [{ Label: 'Contact', LanguageCode: 1033 }]
        },
        SchemaName: 'Contact'
      },
      {
        LogicalName: 'lead',
        SchemaName: 'Lead'
      }
    ];

    it('should cache entity metadata correctly', () => {
      metadataCache.cacheEntityMetadata(mockEntities);
      
      expect(metadataCache.hasEntityMetadata('account')).toBe(true);
      expect(metadataCache.hasEntityMetadata('contact')).toBe(true);
      expect(metadataCache.hasEntityMetadata('lead')).toBe(true);
      expect(metadataCache.hasEntityMetadata('nonexistent')).toBe(false);
    });

    it('should retrieve cached entity metadata', () => {
      metadataCache.cacheEntityMetadata(mockEntities);
      
      const accountMetadata = metadataCache.getEntityMetadata('account');
      expect(accountMetadata).toBeDefined();
      expect(accountMetadata?.LogicalName).toBe('account');
      expect(accountMetadata?.SchemaName).toBe('Account');
    });

    it('should return undefined for non-cached entities', () => {
      const metadata = metadataCache.getEntityMetadata('nonexistent');
      expect(metadata).toBeUndefined();
    });

    it('should get entity display names correctly', () => {
      metadataCache.cacheEntityMetadata(mockEntities);
      
      // Test UserLocalizedLabel
      expect(metadataCache.getEntityDisplayName('account')).toBe('Account');
      
      // Test LocalizedLabels fallback
      expect(metadataCache.getEntityDisplayName('contact')).toBe('Contact');
      
      // Test logical name fallback when no display name
      expect(metadataCache.getEntityDisplayName('lead')).toBe('lead');
      
      // Test non-existent entity
      expect(metadataCache.getEntityDisplayName('nonexistent')).toBe('nonexistent');
    });
  });

  describe('Picklist Metadata Caching', () => {
    const mockPicklistAttributes = [
      {
        LogicalName: 'statuscode',
        GlobalOptionSet: {
          Options: [
            { Value: 1, Label: { UserLocalizedLabel: { Label: 'Active' } } },
            { Value: 2, Label: { UserLocalizedLabel: { Label: 'Inactive' } } }
          ]
        }
      },
      {
        LogicalName: 'preferredcontactmethodcode',
        OptionSet: {
          Options: [
            { Value: 1, Label: { UserLocalizedLabel: { Label: 'Any' } } },
            { Value: 2, Label: { UserLocalizedLabel: { Label: 'Email' } } },
            { Value: 3, Label: { UserLocalizedLabel: { Label: 'Phone' } } }
          ]
        }
      }
    ];

    it('should cache picklist attributes correctly', () => {
      metadataCache.cachePicklistAttributes('account', mockPicklistAttributes);
      
      expect(metadataCache.hasPicklistAttributes('account')).toBe(true);
      expect(metadataCache.hasPicklistAttributes('contact')).toBe(false);
    });

    it('should retrieve cached picklist attributes', () => {
      metadataCache.cachePicklistAttributes('account', mockPicklistAttributes);
      
      const attributes = metadataCache.getPicklistAttributes('account');
      expect(attributes).toBeDefined();
      expect(attributes).toHaveLength(2);
      expect(attributes?.[0].LogicalName).toBe('statuscode');
      expect(attributes?.[1].LogicalName).toBe('preferredcontactmethodcode');
    });

    it('should return undefined for non-cached picklist attributes', () => {
      const attributes = metadataCache.getPicklistAttributes('nonexistent');
      expect(attributes).toBeUndefined();
    });
  });

  describe('Cache Management', () => {
    it('should clear all caches', () => {
      const mockEntities: EntityMetadata[] = [{
        LogicalName: 'account',
        SchemaName: 'Account'
      }];
      
      metadataCache.cacheEntityMetadata(mockEntities);
      metadataCache.cachePicklistAttributes('account', []);
      
      expect(metadataCache.hasEntityMetadata('account')).toBe(true);
      expect(metadataCache.hasPicklistAttributes('account')).toBe(true);
      
      metadataCache.clear();
      
      expect(metadataCache.hasEntityMetadata('account')).toBe(false);
      expect(metadataCache.hasPicklistAttributes('account')).toBe(false);
    });

    it('should provide accurate cache statistics', () => {
      const mockEntities: EntityMetadata[] = [
        {
          LogicalName: 'account',
          SchemaName: 'Account'
        },
        {
          LogicalName: 'contact',
          SchemaName: 'Contact'
        }
      ];
      
      metadataCache.cacheEntityMetadata(mockEntities);
      metadataCache.cachePicklistAttributes('account', []);
      metadataCache.cachePicklistAttributes('contact', []);
      
      const stats = metadataCache.getCacheStats();
      
      expect(stats.entityMetadata.size).toBe(2);
      expect(stats.entityMetadata.entities).toContain('account');
      expect(stats.entityMetadata.entities).toContain('contact');
      
      expect(stats.picklistMetadata.size).toBe(2);
      expect(stats.picklistMetadata.entities).toContain('account');
      expect(stats.picklistMetadata.entities).toContain('contact');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty entity metadata arrays', () => {
      metadataCache.cacheEntityMetadata([]);
      const stats = metadataCache.getCacheStats();
      expect(stats.entityMetadata.size).toBe(0);
    });

    it('should handle entities without LogicalName', () => {
      const invalidEntities = [{
        SchemaName: 'Invalid'
      }] as EntityMetadata[];
      
      metadataCache.cacheEntityMetadata(invalidEntities);
      const stats = metadataCache.getCacheStats();
      expect(stats.entityMetadata.size).toBe(0);
    });

    it('should handle empty picklist attributes', () => {
      metadataCache.cachePicklistAttributes('account', []);
      
      expect(metadataCache.hasPicklistAttributes('account')).toBe(true);
      const attributes = metadataCache.getPicklistAttributes('account');
      expect(attributes).toEqual([]);
    });
  });
});