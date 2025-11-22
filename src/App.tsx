import { useCallback, useState, useEffect } from 'react';
import { useConnection, useToolboxEvents } from './hooks/useToolboxAPI';
import { EntitySelectionPanel } from './components/EntitySelectionPanel';
import { SearchControlsPanel } from './components/SearchControlsPanel';
import { SearchResults } from './components/SearchResults';
import { SearchMode, SearchOptions, SearchResult } from './types/search';
import { UniversalSearchService } from './services/UniversalSearchService';

function App() {
    const { connection, isLoading, refreshConnection } = useConnection();
    const [searchMode, setSearchMode] = useState<SearchMode>('records');
    const [searchText, setSearchText] = useState('');
    const [searchService] = useState(() => new UniversalSearchService());
    const [searchOptions, setSearchOptions] = useState<SearchOptions>({
        matchCase: false,
        searchOptionSetText: true,
        searchLookupText: true,
        searchAttributes: true,
        searchEntities: true,
        searchRelationships: false,
        searchFormsViews: false,
        alwaysGetLatestSolution: false
    });
    const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
    const [selectedSolution, setSelectedSolution] = useState<string | null>(null);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Theme detection and application
    useEffect(() => {
        const applyTheme = async () => {
            try {
                if (window.toolboxAPI?.utils?.getCurrentTheme) {
                    const theme = await window.toolboxAPI.utils.getCurrentTheme();
                    console.log('Detected theme:', theme);
                    
                    // Apply theme to document
                    if (theme === 'dark' || theme.includes('dark')) {
                        document.documentElement.setAttribute('data-theme', 'dark');
                    } else {
                        document.documentElement.removeAttribute('data-theme');
                    }
                } else {
                    console.log('Theme API not available, using default theme');
                }
            } catch (error) {
                console.error('Error getting theme:', error);
                // Fallback to light theme
                document.documentElement.removeAttribute('data-theme');
            }
        };

        applyTheme();

        // Re-check theme periodically for changes
        const themeInterval = setInterval(applyTheme, 5000);
        
        return () => {
            clearInterval(themeInterval);
        };
    }, []);

    // Handle platform events
    const handleEvent = useCallback(
        (event: string, _data: any) => {
            switch (event) {
                case 'connection:updated':
                case 'connection:created':
                    refreshConnection();
                    break;

                case 'connection:deleted':
                    refreshConnection();
                    setSearchResults([]);
                    break;
            }
        },
        [refreshConnection]
    );

    useToolboxEvents(handleEvent);

    const handleSearch = async () => {
        if (!searchText.trim() || !connection) return;
        
        setIsSearching(true);
        setSearchResults([]);
        
        try {
            const results = await searchService.search(
                searchText,
                searchMode,
                selectedEntities,
                selectedSolution,
                searchOptions
            );
            
            setSearchResults(results);
            
            const totalRecords = results.reduce((sum, result) => sum + result.totalCount, 0);
            await window.toolboxAPI.utils.showNotification({
                title: 'Search Complete',
                body: `Found ${totalRecords} results across ${results.length} ${searchMode === 'records' ? 'entities' : searchMode === 'metadata' ? 'metadata types' : 'files'}`,
                type: 'success'
            });
            
        } catch (error) {
            console.error('Search error:', error);
            await window.toolboxAPI.utils.showNotification({
                title: 'Search Error',
                body: (error as Error).message,
                type: 'error'
            });
        } finally {
            setIsSearching(false);
        }
    };

    if (!connection && !isLoading) {
        return (
            <div className="app">
                <header className="header">
                    <h1>🔍 Universal Search</h1>
                    <p className="subtitle">Search across records, metadata, and solution components</p>
                </header>
                <div className="error-message">
                    <strong>⚠️ No Connection</strong><br/>
                    Please connect to a Dataverse environment first.
                </div>
            </div>
        );
    }

    return (
        <div className="app">
            <header className="header">
                <h1>🔍 Universal Search</h1>
                <p className="subtitle">Search across records, metadata, and solution components</p>
            </header>

            <div className="main-container">
                <div className="left-panel">
                    <EntitySelectionPanel
                        connection={connection}
                        searchMode={searchMode}
                        selectedEntities={selectedEntities}
                        selectedSolution={selectedSolution}
                        onEntitiesChange={setSelectedEntities}
                        onSolutionChange={setSelectedSolution}
                    />
                </div>
                
                <div className="right-panel">
                    <SearchControlsPanel
                        searchMode={searchMode}
                        searchText={searchText}
                        searchOptions={searchOptions}
                        isSearching={isSearching}
                        onModeChange={setSearchMode}
                        onSearchTextChange={setSearchText}
                        onOptionsChange={setSearchOptions}
                        onSearch={handleSearch}
                    />
                    
                    <SearchResults
                        results={searchResults}
                        searchText={searchText}
                        isSearching={isSearching}
                    />
                </div>
            </div>
        </div>
    );
}

export default App;