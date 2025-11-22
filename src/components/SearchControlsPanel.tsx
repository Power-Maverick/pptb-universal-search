interface SearchOptions {
    matchCase: boolean;
    searchOptionSetText: boolean;
    searchLookupText: boolean;
    searchAttributes: boolean;
    searchEntities: boolean;
    searchRelationships: boolean;
    searchFormsViews: boolean;
    alwaysGetLatestSolution: boolean;
}

interface SearchControlsPanelProps {
    searchMode: string;
    searchText: string;
    searchOptions: SearchOptions;
    isSearching: boolean;
    onModeChange: (mode: any) => void;
    onSearchTextChange: (text: string) => void;
    onOptionsChange: (options: SearchOptions) => void;
    onSearch: () => void;
}

export function SearchControlsPanel({
    searchMode,
    searchText,
    isSearching,
    onSearchTextChange,
    onSearch
}: SearchControlsPanelProps) {
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
                    />
                    <button
                        onClick={onSearch}
                        disabled={!searchText.trim() || isSearching}
                        className="search-button"
                    >
                        {isSearching ? 'Searching...' : `Search ${searchMode}`}
                    </button>
                </div>
            </div>
        </div>
    );
}