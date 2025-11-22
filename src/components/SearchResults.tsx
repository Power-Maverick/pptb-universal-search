import { useState, useMemo } from 'react';
import './SearchResults.css';

interface SearchResult {
    id: string;
    entityName: string;
    tabTitle: string;
    type: string;
    records: any[];
    totalCount: number;
    error?: string;
}

interface SearchResultsProps {
    results: SearchResult[];
    searchText: string;
    isSearching: boolean;
}

export function SearchResults({ results, searchText, isSearching }: SearchResultsProps) {
    const [activeTabIndex, setActiveTabIndex] = useState(0);
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Filter out results with errors or no records for tabs
    const validResults = results.filter(result => !result.error && result.records.length > 0);
    const activeResult = validResults[activeTabIndex];

    // Get columns from records, preferring formatted values and excluding system fields
    const columns = useMemo(() => {
        if (!activeResult || !activeResult.records.length) return [];
        
        const allKeys = new Set<string>();
        const formattedKeys = new Set<string>();
        
        // First pass: identify all keys and formatted keys
        activeResult.records.forEach(record => {
            Object.keys(record).forEach(key => {
                if (key.includes('@OData.Community.Display.V1.FormattedValue')) {
                    const baseKey = key.replace('@OData.Community.Display.V1.FormattedValue', '');
                    formattedKeys.add(baseKey);
                } else if (!key.startsWith('_') && 
                    key !== 'id' && 
                    !key.includes('@') &&
                    !key.startsWith('createdon') &&
                    !key.startsWith('createdby') &&
                    !key.startsWith('modifiedon') &&
                    !key.startsWith('modifiedby') &&
                    !key.startsWith('versionnumber') &&
                    key !== 'owningbusinessunit' &&
                    key !== 'owninguser' &&
                    key !== 'owningteam') {
                    allKeys.add(key);
                }
            });
        });
        
        // Filter to show only relevant columns, preferring those with formatted values
        const finalKeys = Array.from(allKeys).filter(key => {
            // Skip raw values if we have formatted versions
            if (formattedKeys.has(key)) {
                return false; // We'll use the formatted version instead
            }
            return true;
        });
        
        // Add formatted keys as display columns
        formattedKeys.forEach(key => {
            finalKeys.push(key);
        });
        
        // Sort columns with primary fields first
        const sortedKeys = finalKeys.sort((a, b) => {
            // Put primary name and id fields first
            const aIsPrimary = a.includes('name') || a === `${activeResult.entityName}id` || a === 'contactid';
            const bIsPrimary = b.includes('name') || b === `${activeResult.entityName}id` || b === 'contactid';
            
            if (aIsPrimary && !bIsPrimary) return -1;
            if (!aIsPrimary && bIsPrimary) return 1;
            
            return a.localeCompare(b);
        });
        
        return sortedKeys;
    }, [activeResult]);

    // Sort records if sort is applied
    const sortedRecords = useMemo(() => {
        if (!activeResult || !sortColumn) return activeResult?.records || [];
        
        return [...activeResult.records].sort((a, b) => {
            const aVal = a[sortColumn];
            const bVal = b[sortColumn];
            
            // Handle null/undefined values
            if (aVal == null && bVal == null) return 0;
            if (aVal == null) return sortDirection === 'asc' ? -1 : 1;
            if (bVal == null) return sortDirection === 'asc' ? 1 : -1;
            
            // Convert to strings for comparison
            const aStr = String(aVal).toLowerCase();
            const bStr = String(bVal).toLowerCase();
            
            const comparison = aStr.localeCompare(bStr);
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [activeResult, sortColumn, sortDirection]);

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const getCellValue = (record: any, column: string): any => {
        // First try to get the formatted value
        const formattedKey = `${column}@OData.Community.Display.V1.FormattedValue`;
        if (record[formattedKey] !== undefined) {
            return record[formattedKey];
        }
        
        // Fall back to raw value
        return record[column];
    };

    const highlightSearchText = (text: string, searchTerm: string): JSX.Element => {
        if (!searchTerm || !text) {
            return <span>{text || ''}</span>;
        }
        
        const textStr = String(text);
        // Remove wildcards from search term for highlighting
        const cleanSearchTerm = searchTerm.replace(/\*/g, '');
        
        if (!cleanSearchTerm) {
            return <span>{textStr}</span>;
        }
        
        const regex = new RegExp(`(${cleanSearchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        
        // Only highlight if the text actually contains the search term
        if (!regex.test(textStr)) {
            return <span>{textStr}</span>;
        }
        
        // Reset regex since test() advances the lastIndex
        regex.lastIndex = 0;
        const parts = textStr.split(regex);
        
        return (
            <span>
                {parts.map((part, index) => {
                    // Create a new regex for each test to avoid lastIndex issues
                    const testRegex = new RegExp(`^${cleanSearchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
                    return testRegex.test(part) ? 
                        <mark key={index} className="highlight">{part}</mark> : 
                        <span key={index}>{part}</span>;
                })}
            </span>
        );
    };

    const formatCellValue = (value: any, searchTerm: string): JSX.Element => {
        if (value == null) {
            return <span className="null-value">—</span>;
        }
        
        // Handle different data types
        if (typeof value === 'boolean') {
            const displayValue = value ? 'Yes' : 'No';
            return <span className={`boolean-value ${value}`}>{highlightSearchText(displayValue, searchTerm)}</span>;
        }
        
        if (typeof value === 'object') {
            // Handle lookup/reference objects
            if (value.name || value.Name) {
                return highlightSearchText(value.name || value.Name, searchTerm);
            }
            // Handle other objects by showing JSON
            return <span className="object-value">{highlightSearchText(JSON.stringify(value), searchTerm)}</span>;
        }
        
        // Handle dates
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
            try {
                const date = new Date(value);
                const dateStr = date.toLocaleString();
                return <span className="date-value">{highlightSearchText(dateStr, searchTerm)}</span>;
            } catch {
                return highlightSearchText(value, searchTerm);
            }
        }
        
        return highlightSearchText(String(value), searchTerm);
    };

    // Helper function to check if a value contains the search term
    const containsSearchTerm = (value: any, searchTerm: string): boolean => {
        if (!searchTerm.trim() || value == null) return false;
        
        const cleanSearchTerm = searchTerm.replace(/\*/g, '');
        if (!cleanSearchTerm) return false;
        
        let textToSearch = '';
        if (typeof value === 'object') {
            textToSearch = value.name || value.Name || JSON.stringify(value);
        } else if (typeof value === 'boolean') {
            textToSearch = value ? 'Yes' : 'No';
        } else {
            textToSearch = String(value);
        }
        
        const regex = new RegExp(cleanSearchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        return regex.test(textToSearch);
    };

    if (isSearching) {
        return (
            <div className="search-results">
                <div className="results-header">
                    <h3>Search Results</h3>
                </div>
                <div className="loading-message">
                    <div className="spinner"></div>
                    <span>Searching...</span>
                </div>
            </div>
        );
    }

    if (results.length === 0) {
        return (
            <div className="search-results">
                <div className="results-header">
                    <h3>Search Results</h3>
                </div>
                <div className="no-results">
                    {searchText ? 'No results found. Try adjusting your search criteria.' : 'Enter a search term and click Search to begin.'}
                </div>
            </div>
        );
    }

    const totalRecords = results.reduce((sum, r) => sum + r.totalCount, 0);

    return (
        <div className="search-results">
            <div className="results-header">
                <h3>Search Results</h3>
                <div className="results-summary">
                    Found {results.length} result tab{results.length === 1 ? '' : 's'} with {totalRecords} total record{totalRecords === 1 ? '' : 's'}.
                </div>
            </div>
            
            {/* Show errors if any */}
            {results.some(r => r.error) && (
                <div className="error-results">
                    {results.filter(r => r.error).map(result => (
                        <div key={result.id} className="error-item">
                            <strong>{result.tabTitle}:</strong> {result.error}
                        </div>
                    ))}
                </div>
            )}
            
            {/* Tabs for valid results */}
            {validResults.length > 0 && (
                <div className="results-tabs">
                    <div className="tab-headers">
                        {validResults.map((result, index) => (
                            <button
                                key={result.id}
                                className={`tab-header ${index === activeTabIndex ? 'active' : ''}`}
                                onClick={() => setActiveTabIndex(index)}
                            >
                                {result.tabTitle}
                            </button>
                        ))}
                    </div>
                    
                    {/* Active tab content */}
                    {activeResult && (
                        <div className="tab-content">
                            <div className="tab-info">
                                <span>{activeResult.totalCount} record{activeResult.totalCount === 1 ? '' : 's'} found</span>
                                {sortColumn && (
                                    <span className="sort-info">
                                        Sorted by {sortColumn} ({sortDirection === 'asc' ? 'A-Z' : 'Z-A'})
                                    </span>
                                )}
                            </div>
                            
                            {activeResult.records.length > 0 ? (
                                <div className="data-grid-container">
                                    <table className="data-grid">
                                        <thead>
                                            <tr>
                                                {columns.map(column => (
                                                    <th 
                                                        key={column} 
                                                        className={`sortable ${sortColumn === column ? `sorted-${sortDirection}` : ''}`}
                                                        onClick={() => handleSort(column)}
                                                        title={`Click to sort by ${column}`}
                                                    >
                                                        <div className="header-content">
                                                            <span>{column.replace(/@OData\.Community\.Display\.V1\.FormattedValue$/, '')}</span>
                                                            <span className="sort-indicator">
                                                                {sortColumn === column ? 
                                                                    (sortDirection === 'asc' ? ' ↑' : ' ↓') : 
                                                                    ' ↕'
                                                                }
                                                            </span>
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedRecords.map((record, recordIndex) => (
                                                <tr key={record.id || recordIndex} className="data-row">
                                                    {columns.map(column => {
                                                        const cellValue = getCellValue(record, column);
                                                        return (
                                                            <td 
                                                                key={column} 
                                                                className={`data-cell ${
                                                                    containsSearchTerm(record[column], searchText) ? 'has-highlight' : ''
                                                                }`}
                                                            >
                                                                {formatCellValue(cellValue, searchText)}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="no-records">
                                    No records to display in this result set.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}