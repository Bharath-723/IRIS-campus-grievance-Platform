import React from 'react';
import { Search } from 'lucide-react';

interface ToolbarProps {
  activeSeverity: string;
  onSelectSeverity: (sev: string) => void;
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeSeverity,
  onSelectSeverity,
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
}) => {
  const severities = ['all', 'critical', 'high', 'medium', 'low'];
  const categories = [
    { key: 'all', label: 'All' },
    { key: 'infra', label: '🏢 Infra' },
    { key: 'hygiene', label: '🧹 Hygiene' },
    { key: 'tech', label: '💻 Tech' },
    { key: 'safe', label: '⚠ Safety' },
    { key: 'admin', label: '📋 Admin' },
  ];

  return (
    <div className="toolbar">
      <div className="filter-group">
        <span className="filter-label">Severity</span>
        {severities.map((sev) => (
          <button
            key={sev}
            className={`filter-btn ${activeSeverity === sev ? 'active' : ''}`}
            onClick={() => onSelectSeverity(sev)}
          >
            {sev.charAt(0).toUpperCase() + sev.slice(1)}
          </button>
        ))}
      </div>

      <div className="filter-divider" />

      <div className="filter-group">
        <span className="filter-label">Category</span>
        {categories.map((cat) => (
          <button
            key={cat.key}
            className={`filter-btn ${activeCategory === cat.key ? 'active' : ''}`}
            onClick={() => onSelectCategory(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="search-box">
        <Search className="search-icon" size={14} />
        <input
          type="text"
          placeholder="Search issues, place..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
};
