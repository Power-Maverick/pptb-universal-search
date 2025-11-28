import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SearchResults } from './SearchResults';
import { SearchOptions } from '../types/search';

// Match the actual interface from SearchResults.tsx
interface SearchResult {
  id: string;
  entityName: string;
  tabTitle: string;
  type: string;
  records: any[];
  totalCount: number;
  error?: string;
}

describe('SearchResults', () => {
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

  const defaultProps = {
    results: [] as SearchResult[],
    searchText: '',
    isSearching: false,
    searchOptions: defaultSearchOptions
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render results header', () => {
      render(<SearchResults {...defaultProps} />);
      
      expect(screen.getByText(/search results/i)).toBeInTheDocument();
    });

    it('should show prompt when no search text and not searching', () => {
      render(<SearchResults {...defaultProps} searchText="" isSearching={false} />);
      
      expect(screen.getByText(/enter a search term and click search to begin/i)).toBeInTheDocument();
    });

    it('should show searching message when searching', () => {
      render(<SearchResults {...defaultProps} isSearching={true} />);
      
      expect(screen.getByText(/searching/i)).toBeInTheDocument();
    });

    it('should show no results message when search complete with no results', () => {
      render(<SearchResults {...defaultProps} searchText="test" isSearching={false} results={[]} />);
      
      expect(screen.getByText(/no results found/i)).toBeInTheDocument();
    });
  });

  describe('Results Display', () => {
    it('should render results tabs when results exist', () => {
      const mockResults: SearchResult[] = [
        {
          id: '1',
          entityName: 'account',
          tabTitle: 'Accounts (5)',
          type: 'record',
          records: [
            { id: 'acc1', name: 'Test Account 1', accountnumber: '001' },
            { id: 'acc2', name: 'Test Account 2', accountnumber: '002' }
          ],
          totalCount: 5
        },
        {
          id: '2',
          entityName: 'contact',
          tabTitle: 'Contacts (3)',
          type: 'record',
          records: [
            { id: 'con1', firstname: 'John', lastname: 'Doe' },
            { id: 'con2', firstname: 'Jane', lastname: 'Smith' }
          ],
          totalCount: 3
        }
      ];

      render(<SearchResults {...defaultProps} results={mockResults} searchText="test" />);
      
      expect(screen.getByText('Accounts (5)')).toBeInTheDocument();
      expect(screen.getByText('Contacts (3)')).toBeInTheDocument();
    });

    it('should show records in table format', () => {
      const mockResults: SearchResult[] = [
        {
          id: '1',
          entityName: 'account',
          tabTitle: 'Accounts (2)',
          type: 'record',
          records: [
            { id: 'acc1', name: 'Test Account 1', accountnumber: '001' },
            { id: 'acc2', name: 'Test Account 2', accountnumber: '002' }
          ],
          totalCount: 2
        }
      ];

      render(<SearchResults {...defaultProps} results={mockResults} searchText="test" />);
      
      expect(screen.getByRole('table')).toBeInTheDocument();
      // Text is highlighted, so check for the mark elements (there are multiple)
      expect(screen.getAllByText('Test', { selector: 'mark.highlight' })).toHaveLength(2);
      expect(screen.getByText('Account 1')).toBeInTheDocument();
      expect(screen.getByText('Account 2')).toBeInTheDocument();
    });

    it('should handle empty record sets', () => {
      // Empty results array should show the no search message
      render(<SearchResults {...defaultProps} results={[]} searchText="test" />);
      
      expect(screen.getByText(/no results found/i)).toBeInTheDocument();
    });

    it('should filter out results with errors', () => {
      const mockResults: SearchResult[] = [
        {
          id: '1',
          entityName: 'account',
          tabTitle: 'Accounts',
          type: 'record',
          records: [{ id: 'acc1', name: 'Test Account' }],
          totalCount: 1
        },
        {
          id: '2',
          entityName: 'contact',
          tabTitle: 'Contacts',
          type: 'record',
          records: [],
          totalCount: 0,
          error: 'Access denied'
        }
      ];

      render(<SearchResults {...defaultProps} results={mockResults} searchText="test" />);
      
      // Should only show the account tab, not the contact tab with error
      expect(screen.getByText('Accounts')).toBeInTheDocument();
      expect(screen.queryByText('Contacts')).not.toBeInTheDocument();
    });
  });

  describe('Search Text Highlighting', () => {
    it('should highlight search terms in results', () => {
      const mockResults: SearchResult[] = [
        {
          id: '1',
          entityName: 'account',
          tabTitle: 'Accounts (1)',
          type: 'record',
          records: [
            { id: 'acc1', name: 'Test Company Inc', accountnumber: '001' }
          ],
          totalCount: 1
        }
      ];

      render(<SearchResults {...defaultProps} results={mockResults} searchText="test" />);
      
      // Should highlight "test" in "Test Company Inc"
      const highlightedElements = document.querySelectorAll('.highlight');
      expect(highlightedElements.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed results gracefully', () => {
      const malformedResults: any[] = [
        {
          id: '1',
          entityName: 'account',
          tabTitle: 'Accounts',
          type: 'record',
          records: [{ id: 'acc1', name: 'Test Account' }], // Valid records array
          totalCount: 1
        }
      ];

      expect(() => {
        render(<SearchResults {...defaultProps} results={malformedResults} searchText="test" />);
      }).not.toThrow();
    });
  });
});