import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchControlsPanel } from './SearchControlsPanel';
import { SearchOptions } from '../types/search';

describe('SearchControlsPanel', () => {
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
    searchMode: 'records' as const,
    searchText: '',
    searchOptions: defaultSearchOptions,
    isSearching: false,
    onModeChange: vi.fn(),
    onSearchTextChange: vi.fn(),
    onOptionsChange: vi.fn(),
    onSearch: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render search mode tabs', () => {
      render(<SearchControlsPanel {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /records/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /metadata/i })).toBeInTheDocument();
    });

    it('should render match case checkbox', () => {
      render(<SearchControlsPanel {...defaultProps} />);
      
      const matchCaseCheckbox = screen.getByRole('checkbox', { name: /match case/i });
      expect(matchCaseCheckbox).toBeInTheDocument();
      expect(matchCaseCheckbox).not.toBeChecked();
    });

    it('should render search text input', () => {
      render(<SearchControlsPanel {...defaultProps} />);
      
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render search button', () => {
      render(<SearchControlsPanel {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    });
  });

  describe('Records Mode Options', () => {
    it('should show records-specific options when in records mode', () => {
      render(<SearchControlsPanel {...defaultProps} searchMode="records" />);
      
      expect(screen.getByRole('checkbox', { name: /search picklists/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /search lookups/i })).toBeInTheDocument();
    });

    it('should handle search picklists toggle', () => {
      render(<SearchControlsPanel {...defaultProps} searchMode="records" />);
      
      const picklistsCheckbox = screen.getByRole('checkbox', { name: /search picklists/i });
      fireEvent.click(picklistsCheckbox);
      
      expect(defaultProps.onOptionsChange).toHaveBeenCalledWith({
        ...defaultSearchOptions,
        searchPicklists: true
      });
    });

    it('should handle search lookups toggle', () => {
      render(<SearchControlsPanel {...defaultProps} searchMode="records" />);
      
      const lookupsCheckbox = screen.getByRole('checkbox', { name: /search lookups/i });
      fireEvent.click(lookupsCheckbox);
      
      expect(defaultProps.onOptionsChange).toHaveBeenCalledWith({
        ...defaultSearchOptions,
        searchLookups: true
      });
    });
  });

  describe('Search Interaction', () => {
    it('should handle search text change', () => {
      render(<SearchControlsPanel {...defaultProps} />);
      
      const searchInput = screen.getByRole('textbox');
      fireEvent.change(searchInput, { target: { value: 'test search' } });
      
      expect(defaultProps.onSearchTextChange).toHaveBeenCalledWith('test search');
    });

    it('should handle search button click', () => {
      render(<SearchControlsPanel {...defaultProps} searchText="test" />);
      
      const searchButton = screen.getByRole('button', { name: /search/i });
      fireEvent.click(searchButton);
      
      expect(defaultProps.onSearch).toHaveBeenCalled();
    });

    it('should handle mode change via tab buttons', () => {
      render(<SearchControlsPanel {...defaultProps} />);
      
      const metadataTab = screen.getByRole('button', { name: /metadata/i });
      fireEvent.click(metadataTab);
      
      expect(defaultProps.onModeChange).toHaveBeenCalledWith('metadata');
    });
  });

  describe('Disabled States', () => {
    it('should disable controls when searching', () => {
      render(<SearchControlsPanel {...defaultProps} isSearching={true} />);
      
      const searchInput = screen.getByRole('textbox');
      const searchButton = screen.getByRole('button', { name: /search/i });
      const matchCaseCheckbox = screen.getByRole('checkbox', { name: /match case/i });
      
      expect(searchInput).toBeDisabled();
      expect(searchButton).toBeDisabled();
      expect(matchCaseCheckbox).toBeDisabled();
    });

    it('should enable controls when not searching', () => {
      render(<SearchControlsPanel {...defaultProps} isSearching={false} />);
      
      const searchInput = screen.getByRole('textbox');
      const matchCaseCheckbox = screen.getByRole('checkbox', { name: /match case/i });
      
      expect(searchInput).not.toBeDisabled();
      expect(matchCaseCheckbox).not.toBeDisabled();
    });

    it('should disable search button when no search text', () => {
      render(<SearchControlsPanel {...defaultProps} searchText="" />);
      
      const searchButton = screen.getByRole('button', { name: /search/i });
      expect(searchButton).toBeDisabled();
    });

    it('should enable search button when search text provided', () => {
      render(<SearchControlsPanel {...defaultProps} searchText="test" />);
      
      const searchButton = screen.getByRole('button', { name: /search/i });
      expect(searchButton).not.toBeDisabled();
    });
  });
});