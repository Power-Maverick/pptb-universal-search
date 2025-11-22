import React from 'react';
import { SearchProgress } from '../types/search';

interface SearchProgressIndicatorProps {
    progress: SearchProgress;
    onCancel: () => void;
}

export const SearchProgressIndicator: React.FC<SearchProgressIndicatorProps> = ({
    progress,
    onCancel
}) => {
    const progressPercentage = progress.totalEntities > 0 
        ? Math.round((progress.entitiesCompleted / progress.totalEntities) * 100)
        : 0;

    const formatTimeRemaining = (seconds?: number) => {
        if (!seconds || seconds <= 0) return '';
        
        if (seconds < 60) {
            return `${Math.round(seconds)}s remaining`;
        } else if (seconds < 3600) {
            const minutes = Math.round(seconds / 60);
            return `${minutes}m remaining`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.round((seconds % 3600) / 60);
            return `${hours}h ${minutes}m remaining`;
        }
    };

    if (!progress.isSearching) {
        return null;
    }

    return (
        <div className="search-progress-indicator">
            <div className="progress-header">
                <div className="progress-info">
                    <div className="progress-status">
                        <span className="current-entity">Searching: {progress.currentEntity}</span>
                        <span className="progress-stats">
                            {progress.entitiesCompleted} of {progress.totalEntities} entities completed
                        </span>
                    </div>
                    {progress.estimatedTimeRemaining && (
                        <div className="time-remaining">
                            {formatTimeRemaining(progress.estimatedTimeRemaining)}
                        </div>
                    )}
                </div>
                <button 
                    className="cancel-button"
                    onClick={onCancel}
                    title="Cancel search"
                >
                    Cancel
                </button>
            </div>
            
            <div className="progress-bar-container">
                <div 
                    className="progress-bar"
                    style={{ width: `${progressPercentage}%` }}
                />
                <span className="progress-percentage">{progressPercentage}%</span>
            </div>
        </div>
    );
};