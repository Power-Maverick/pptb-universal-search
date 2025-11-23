import { useEffect, useState } from 'react';
import { SearchMode, EntityMetadata, SolutionInfo } from '../types/search';
import { metadataCache } from '../services/MetadataCache';

interface EntitySelectionPanelProps {
    connection: any;
    searchMode: SearchMode;
    selectedEntities: string[];
    selectedSolution: string | null;
    onEntitiesChange: (entities: string[]) => void;
    onSolutionChange: (solution: string | null) => void;
}

export function EntitySelectionPanel({
    connection,
    searchMode,
    selectedEntities,
    selectedSolution,
    onEntitiesChange,
    onSolutionChange
}: EntitySelectionPanelProps) {
    const [entities, setEntities] = useState<EntityMetadata[]>([]);
    const [solutions, setSolutions] = useState<SolutionInfo[]>([]);
    const [isLoadingSolutions, setIsLoadingSolutions] = useState(false);
    const [isLoadingEntities, setIsLoadingEntities] = useState(false);
    const [searchFilter, setSearchFilter] = useState('');
    const [showSystemEntities, setShowSystemEntities] = useState(false);
    const [hasLoadedSolutions, setHasLoadedSolutions] = useState(false);

    // Load solutions when component mounts and we have a connection
    useEffect(() => {
        if (connection && !hasLoadedSolutions) {
            loadSolutions();
        }
    }, [connection, hasLoadedSolutions]);

    const loadSolutions = async () => {
        if (!connection) return;
        
        setIsLoadingSolutions(true);
        try {
            const fetchXml = `
                <fetch>
                    <entity name="solution">
                        <attribute name="uniquename" />
                        <attribute name="friendlyname" />
                        <attribute name="version" />
                        <attribute name="ismanaged" />
                        <filter type="and">
                            <condition attribute="isvisible" operator="eq" value="true" />
                        </filter>
                        <order attribute="friendlyname" />
                    </entity>
                </fetch>
            `;
            
            const response = await window.dataverseAPI.fetchXmlQuery(fetchXml);
            const solutionList = response.value.map((record: any) => ({
                UniqueName: record.uniquename,
                FriendlyName: record.friendlyname,
                Version: record.version,
                IsManaged: record.ismanaged
            }));
            
            setSolutions(solutionList);
            setHasLoadedSolutions(true);
            
            // Auto-select "Default" solution if available
            const defaultSolution = solutionList.find((s: SolutionInfo) => s.UniqueName.toLowerCase() === 'default');
            if (defaultSolution && !selectedSolution) {
                onSolutionChange(defaultSolution.UniqueName);
            }
            
        } catch (error) {
            console.error('Error loading solutions:', error);
            await window.toolboxAPI.utils.showNotification({
                title: 'Error',
                body: `Failed to load solutions: ${(error as Error).message}`,
                type: 'error'
            });
        } finally {
            setIsLoadingSolutions(false);
        }
    };

    const loadEntities = async () => {
        if (!connection || !selectedSolution) return;
        
        setIsLoadingEntities(true);
        setEntities([]);
        onEntitiesChange([]);
        
        // Clear metadata cache when loading new entity set
        metadataCache.clear();
        
        try {
            // First get all entities
            const allEntitiesResponse = await window.dataverseAPI.getAllEntitiesMetadata();
            let entityList = allEntitiesResponse.value as EntityMetadata[];
            
            // If a specific solution is selected (not Default), filter to entities in that solution
            if (selectedSolution.toLowerCase() !== 'default') {
                // Get solution components for the selected solution
                const solutionComponentsFetch = `
                    <fetch>
                        <entity name="solutioncomponent">
                            <attribute name="objectid" />
                            <attribute name="componenttype" />
                            <link-entity name="solution" from="solutionid" to="solutionid">
                                <filter>
                                    <condition attribute="uniquename" operator="eq" value="${selectedSolution}" />
                                </filter>
                            </link-entity>
                            <filter>
                                <condition attribute="componenttype" operator="eq" value="1" />
                            </filter>
                        </entity>
                    </fetch>
                `;
                
                try {
                    const solutionComponentsResponse = await window.dataverseAPI.fetchXmlQuery(solutionComponentsFetch);
                    const entityIds = solutionComponentsResponse.value.map((sc: any) => sc.objectid.toLowerCase());
                    
                    // Filter entities to only those in the solution
                    entityList = entityList.filter(entity => 
                        entityIds.includes((entity.MetadataId || entity.LogicalName).toLowerCase())
                    );
                } catch (solutionError) {
                    console.warn('Could not filter by solution, showing all entities:', solutionError);
                    // Continue with all entities if solution filtering fails
                }
            }
            
            // Sort entities by display name
            const sortedEntities = entityList
                .sort((a, b) => {
                    const aName = a.DisplayName?.UserLocalizedLabel?.Label || a.LogicalName;
                    const bName = b.DisplayName?.UserLocalizedLabel?.Label || b.LogicalName;
                    return aName.localeCompare(bName);
                });
            
            setEntities(sortedEntities);
            
            // Cache entity metadata for performance optimization during search
            metadataCache.cacheEntityMetadata(sortedEntities);
            
            await window.toolboxAPI.utils.showNotification({
                title: 'Entities Loaded',
                body: `Loaded ${sortedEntities.length} entities from ${selectedSolution}`,
                type: 'success'
            });
            
        } catch (error) {
            console.error('Error loading entities:', error);
            await window.toolboxAPI.utils.showNotification({
                title: 'Error',
                body: `Failed to load entities: ${(error as Error).message}`,
                type: 'error'
            });
        } finally {
            setIsLoadingEntities(false);
        }
    };

    const filteredEntities = entities.filter(entity => {
        const matchesFilter = !searchFilter || 
            entity.LogicalName.toLowerCase().includes(searchFilter.toLowerCase()) ||
            (entity.DisplayName?.UserLocalizedLabel?.Label && 
             entity.DisplayName.UserLocalizedLabel.Label.toLowerCase().includes(searchFilter.toLowerCase()));
        
        const matchesSystemFilter = showSystemEntities || 
            (!entity.LogicalName.startsWith('msdyn_') && 
             !entity.LogicalName.startsWith('mspcat_') &&
             !entity.LogicalName.startsWith('mspp_') &&
             entity.IsCustomEntity !== false);
        
        return matchesFilter && matchesSystemFilter;
    });

    const handleEntityToggle = (entityName: string) => {
        if (selectedEntities.includes(entityName)) {
            onEntitiesChange(selectedEntities.filter(e => e !== entityName));
        } else {
            onEntitiesChange([...selectedEntities, entityName]);
        }
    };

    const handleSelectAll = () => {
        if (selectedEntities.length === filteredEntities.length) {
            onEntitiesChange([]);
        } else {
            onEntitiesChange(filteredEntities.map(e => e.LogicalName));
        }
    };

    // Show solution selection for all modes except 'solution' search mode
    const showSolutionDropdown = searchMode !== 'solution';
    const showEntityList = searchMode !== 'solution' && entities.length > 0;
    const showLoadButton = searchMode !== 'solution' && selectedSolution && !isLoadingEntities;

    if (searchMode === 'solution') {
        return (
            <div className="entity-selection-panel">
                <div className="panel-header">
                    <h3>Solutions</h3>
                </div>
                
                {isLoadingSolutions ? (
                    <div className="loading">Loading solutions...</div>
                ) : (
                    <div className="solution-list">
                        {solutions.length === 0 ? (
                            <div className="no-data">No solutions found</div>
                        ) : (
                            <select 
                                value={selectedSolution || ''} 
                                onChange={(e) => onSolutionChange(e.target.value || null)}
                                className="solution-select"
                            >
                                <option value="">-- Select a solution --</option>
                                {solutions.filter(s => !s.IsManaged).map(solution => (
                                    <option key={solution.UniqueName} value={solution.UniqueName}>
                                        {solution.FriendlyName} ({solution.UniqueName})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="entity-selection-panel">
            <div className="panel-header">
                <h3>Entities</h3>
                
                {showSolutionDropdown && (
                    <div className="solution-dropdown">
                        <label htmlFor="solution-select">Solution:</label>
                        {isLoadingSolutions ? (
                            <div className="loading-small">Loading...</div>
                        ) : (
                            <select 
                                id="solution-select"
                                value={selectedSolution || ''} 
                                onChange={(e) => {
                                    onSolutionChange(e.target.value || null);
                                    setEntities([]); // Clear entities when solution changes
                                    onEntitiesChange([]);
                                }}
                                className="solution-select"
                            >
                                <option value="">-- Select a solution --</option>
                                {solutions.map(solution => (
                                    <option key={solution.UniqueName} value={solution.UniqueName}>
                                        {solution.FriendlyName} ({solution.UniqueName})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                )}
                
                {showLoadButton && (
                    <button 
                        onClick={loadEntities}
                        className="load-entities-btn"
                        disabled={!selectedSolution}
                    >
                        Load Entities
                    </button>
                )}
            </div>
            
            {isLoadingEntities && (
                <div className="loading">Loading entities from {selectedSolution}...</div>
            )}
            
            {showEntityList && (
                <>
                    <div className="entity-controls">
                        <input
                            type="text"
                            placeholder="Filter entities..."
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            className="entity-filter"
                        />
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={showSystemEntities}
                                onChange={(e) => setShowSystemEntities(e.target.checked)}
                            />
                            Show system entities
                        </label>
                        <button 
                            onClick={handleSelectAll}
                            className="select-all-btn"
                            disabled={filteredEntities.length === 0}
                        >
                            {selectedEntities.length === filteredEntities.length ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>
                    
                    <div className="entity-list">
                        {filteredEntities.length === 0 ? (
                            <div className="no-data">
                                {searchFilter ? 'No entities match your filter' : 'No entities found'}
                            </div>
                        ) : (
                            filteredEntities.map(entity => (
                                <label key={entity.LogicalName} className="entity-item">
                                    <input
                                        type="checkbox"
                                        checked={selectedEntities.includes(entity.LogicalName)}
                                        onChange={() => handleEntityToggle(entity.LogicalName)}
                                    />
                                    <div className="entity-info">
                                        <div className="entity-name">
                                            {entity.DisplayName?.UserLocalizedLabel?.Label || entity.LogicalName}
                                        </div>
                                        <div className="entity-logical-name">
                                            {entity.LogicalName}
                                        </div>
                                    </div>
                                </label>
                            ))
                        )}
                    </div>
                </>
            )}
            
            {selectedEntities.length > 0 && (
                <div className="selection-summary">
                    {selectedEntities.length} entit{selectedEntities.length === 1 ? 'y' : 'ies'} selected
                </div>
            )}
            
            {!showEntityList && !isLoadingEntities && selectedSolution && (
                <div className="no-data">
                    Click "Load Entities" to see available entities
                </div>
            )}
        </div>
    );
}