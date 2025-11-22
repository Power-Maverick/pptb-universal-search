import { SearchMode, SearchOptions } from '../types/search';
import './SearchControlsPanel.css';

interface SearchControlsPanelProps {
    searchMode: SearchMode;
    searchText: string;
    searchOptions: SearchOptions;
    isSearching: boolean;
    onModeChange: (mode: SearchMode) => void;
    onSearchTextChange: (text: string) => void;
    onOptionsChange: (options: SearchOptions) => void;
    onSearch: () => void;
}

export function SearchControlsPanel({
    searchMode,
    searchText,
    searchOptions,
    isSearching,
    onModeChange,
    onSearchTextChange,
    onOptionsChange,
    onSearch
}: SearchControlsPanelProps) {
    
    const handleOptionChange = (optionKey: keyof SearchOptions, value: boolean) => {
        onOptionsChange({
            ...searchOptions,
            [optionKey]: value
        });
    };

    const renderSearchOptions = () => {
        switch (searchMode) {
            case 'records':
                return (
                    <div className="search-options">
                        <h4>Options:</h4>
                        <div className="options-grid">
                            <label className="option-item">
                                <input
                                    type="checkbox"
                                    checked={searchOptions.matchCase}
                                    onChange={(e) => handleOptionChange('matchCase', e.target.checked)}
                                    disabled={isSearching}
                                />
                                Match Case
                            </label>
                            <div className="info-text">
                                💡 Lookups & picklists auto-searched
                            </div>
                        </div>
                    </div>
                );
            
            case 'metadata':
                return (
                    <div className="search-options">
                        <h4>Options:</h4>
                        <div className="options-grid">
                            <label className="option-item">
                                <input
                                    type="checkbox"
                                    checked={searchOptions.matchCase}
                                    onChange={(e) => handleOptionChange('matchCase', e.target.checked)}
                                    disabled={isSearching}
                                />
                                Match Case
                            </label>
                            <label className="option-item">
                                <input
                                    type="checkbox"
                                    checked={searchOptions.searchEntities}
                                    onChange={(e) => handleOptionChange('searchEntities', e.target.checked)}
                                    disabled={isSearching}
                                />
                                Entities
                            </label>
                            <label className="option-item">
                                <input
                                    type="checkbox"
                                    checked={searchOptions.searchAttributes}
                                    onChange={(e) => handleOptionChange('searchAttributes', e.target.checked)}
                                    disabled={isSearching}
                                />
                                Attributes
                            </label>
                            <label className="option-item">
                                <input
                                    type="checkbox"
                                    checked={searchOptions.searchRelationships}
                                    onChange={(e) => handleOptionChange('searchRelationships', e.target.checked)}
                                    disabled={isSearching}
                                />
                                Relationships
                            </label>
                            <label className="option-item">
                                <input
                                    type="checkbox"
                                    checked={searchOptions.searchFormsViews}
                                    onChange={(e) => handleOptionChange('searchFormsViews', e.target.checked)}
                                    disabled={isSearching}
                                />
                                Forms & Views
                            </label>
                        </div>
                    </div>
                );
            
            case 'solution':
                return (
                    <div className="search-options">
                        <h4>Options:</h4>
                        <div className="options-grid">
                            <label className="option-item">
                                <input
                                    type="checkbox"
                                    checked={searchOptions.matchCase}
                                    onChange={(e) => handleOptionChange('matchCase', e.target.checked)}
                                    disabled={isSearching}
                                />
                                Match Case
                            </label>
                            <label className="option-item">
                                <input
                                    type="checkbox"
                                    checked={searchOptions.alwaysGetLatestSolution}
                                    onChange={(e) => handleOptionChange('alwaysGetLatestSolution', e.target.checked)}
                                    disabled={isSearching}
                                />
                                Always Get Latest
                            </label>
                        </div>
                    </div>
                );
            
            default:
                return null;
        }
    };

    return (
        <div className="search-controls-panel">
            <div className="search-input-section">
                <div className="search-input-group">
                    <input
                        type="text"
                        placeholder="Enter search text (use * for wildcards)..."
                        value={searchText}
                        onChange={(e) => onSearchTextChange(e.target.value)}
                        className="search-input"
                        disabled={isSearching}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && searchText.trim() && !isSearching) {
                                onSearch();
                            }
                        }}
                    />
                    <button
                        onClick={onSearch}
                        disabled={!searchText.trim() || isSearching}
                        className="search-button"
                    >
                        {isSearching ? 'Searching...' : 'Search'}
                    </button>
                </div>
            </div>
            
            {/* Search Mode Tabs */}
            <div className="search-mode-tabs">
                <div className="tabs-and-options">
                    <div className="tab-headers">
                        <button
                            className={`tab-header ${searchMode === 'records' ? 'active' : ''}`}
                            onClick={() => onModeChange('records')}
                            disabled={isSearching}
                        >
                            Records
                        </button>
                        <button
                            className={`tab-header ${searchMode === 'metadata' ? 'active' : ''}`}
                            onClick={() => onModeChange('metadata')}
                            disabled={isSearching}
                        >
                            Metadata
                        </button>
                        <button
                            className={`tab-header ${searchMode === 'solution' ? 'active' : ''}`}
                            onClick={() => onModeChange('solution')}
                            disabled={isSearching}
                        >
                            Solution
                        </button>
                    </div>
                    
                    {/* Search Options Inline */}
                    <div className="tab-content">
                        {renderSearchOptions()}
                    </div>
                </div>
            </div>
        </div>
    );
}