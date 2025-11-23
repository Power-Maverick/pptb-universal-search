import React from 'react';
import { SearchProgress } from '../types/search';

interface SearchProgressIndicatorProps {
    progress: SearchProgress;
    onCancel: () => void;
    position?: 'top' | 'bottom';
}

export const SearchProgressIndicator: React.FC<SearchProgressIndicatorProps> = ({
    progress,
    onCancel,
    position = 'top'
}) => {
    const progressPercentage = progress.totalEntities > 0 
        ? Math.round((progress.entitiesCompleted / progress.totalEntities) * 100)
        : 0;

    const formatTimeRemaining = (seconds?: number) => {
        if (!seconds || seconds <= 0) return '';
        
        if (seconds < 60) {
            return `${Math.round(seconds)}s left`;
        } else if (seconds < 3600) {
            const minutes = Math.round(seconds / 60);
            return `${minutes}m left`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.round((seconds % 3600) / 60);
            return `${hours}h ${minutes}m left`;
        }
    };

    if (!progress.isSearching) {
        return null;
    }

    return (
        <div className={`search-progress-indicator-compact search-progress-${position}`}>
            <div className="progress-line">
                <div className="progress-text">
                    <span className="progress-entity">Searching {progress.currentEntity}</span>
                    <span className="progress-count">({progress.entitiesCompleted}/{progress.totalEntities})</span>
                    {progress.estimatedTimeRemaining && (
                        <span className="progress-time">{formatTimeRemaining(progress.estimatedTimeRemaining)}</span>
                    )}
                    <span className="progress-percent">{progressPercentage}%</span>
                </div>
                <button 
                    className="progress-cancel-btn"
                    onClick={onCancel}
                    title="Cancel search"
                >
                    Cancel
                </button>
            </div>
            
            <div className="progress-bar-compact">
                <div 
                    className="progress-bar-fill"
                    style={{ width: `${progressPercentage}%` }}
                />
            </div>
        </div>
    );
};