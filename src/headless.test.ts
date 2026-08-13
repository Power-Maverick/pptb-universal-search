import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invokeHeadless, normalizeInput } from './headless';
import { mockDataverseAPI } from './test/setup';

describe('headless invocation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('normalizes natural-language scope and search term', () => {
        const normalized = normalizeInput({
            query: "Search for 'contoso' across records and solution components"
        });

        expect(normalized.searchTerm).toBe('contoso');
        expect(normalized.scope).toEqual(['records', 'solutionComponents']);
        expect(normalized.entities).toEqual([]);
    });

    it('supports primary contact lookup searches for accounts', async () => {
        mockDataverseAPI.getEntityMetadata.mockImplementation(async (entityName: string) => {
            if (entityName === 'account') {
                return {
                    LogicalName: 'account',
                    DisplayName: { LocalizedLabels: [{ Label: 'Account' }] }
                };
            }

            return {
                LogicalName: 'contact',
                PrimaryIdAttribute: 'contactid',
                PrimaryNameAttribute: 'fullname'
            };
        });
        mockDataverseAPI.getEntityRelatedMetadata.mockResolvedValue({
            value: [
                {
                    LogicalName: 'primarycontactid',
                    AttributeType: 'Lookup',
                    IsValidForRead: true,
                    Targets: ['contact']
                }
            ]
        });
        mockDataverseAPI.fetchXmlQuery.mockImplementation(async (fetchXml: string) => {
            expect(fetchXml).toContain('link-entity');
            expect(fetchXml).toContain('attribute="fullname"');
            expect(fetchXml).toContain('value="%Jane%"');

            return {
                value: [
                    {
                        accountid: 'account-1',
                        name: 'Contoso Ltd'
                    }
                ]
            };
        });

        const result = await invokeHeadless(
            { query: "Find every account, containing 'Jane' as the primary contact" },
            { logger: { info: vi.fn(), error: vi.fn() }, updateProgress: vi.fn() }
        );

        expect(result).toEqual({
            totalMatches: 1,
            matches: [
                {
                    type: 'records',
                    entityName: 'account',
                    recordId: 'account-1',
                    displayName: 'Contoso Ltd',
                    matchedField: 'primarycontactid',
                    context: 'contact.fullname contains Jane'
                }
            ]
        });
    });

    it('combines record and solution-component results from natural-language requests', async () => {
        mockDataverseAPI.getAllEntitiesMetadata.mockResolvedValue({
            value: [{ LogicalName: 'account' }]
        });
        mockDataverseAPI.getEntityMetadata.mockImplementation(async (entityName: string) => {
            if (entityName !== 'account') {
                return null;
            }

            return {
                LogicalName: 'account',
                ObjectTypeCode: 1,
                MetadataId: 'metadata-1',
                DisplayName: {
                    LocalizedLabels: [{ Label: 'Contoso Account' }],
                    UserLocalizedLabel: { Label: 'Contoso Account' }
                }
            };
        });
        mockDataverseAPI.getEntityRelatedMetadata.mockResolvedValue({
            value: [
                {
                    LogicalName: 'name',
                    AttributeType: 'String',
                    IsValidForRead: true
                }
            ]
        });
        mockDataverseAPI.fetchXmlQuery.mockImplementation(async (fetchXml: string) => {
            if (fetchXml.includes('<entity name="organization">')) {
                return {
                    value: [
                        {
                            orgdborgsettings: '<settings><ProjectHostEnvironmentId>env-1</ProjectHostEnvironmentId></settings>'
                        }
                    ]
                };
            }

            if (fetchXml.includes('<entity name="account">')) {
                return {
                    value: [
                        {
                            accountid: 'account-1',
                            name: 'Contoso'
                        }
                    ]
                };
            }

            return { value: [] };
        });

        const result = await invokeHeadless({
            query: "Search for 'contoso' across records and solution components"
        });

        expect(result.totalMatches).toBe(2);
        expect(result.matches).toEqual([
            expect.objectContaining({
                type: 'records',
                entityName: 'account',
                recordId: 'account-1',
                displayName: 'Contoso',
                matchedField: 'name',
                context: 'Contoso'
            }),
            expect.objectContaining({
                type: 'metadata',
                entityName: 'account',
                displayName: 'Contoso Account'
            })
        ]);
    });
});
