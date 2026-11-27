import React from 'react';
import { DashboardStats, IssueStatus } from '../types';
import { Sun, Moon } from 'lucide-react';

interface NavbarProps {
  stats: DashboardStats;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  activeStatus: string;
  onSelectStatus: (status: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  stats,
  theme,
  onToggleTheme,
  activeStatus,
  onSelectStatus,
}) => {
  return (
    <header>
      <div className="header-left">
        <div className="logo">
          IRIS <span>Club Dashboard</span>
        </div>
      </div>

      <div className="header-right">
        <div className="header-stats">
          <div
            className={`hstat ${activeStatus === 'all' ? 'active' : ''}`}
            onClick={() => onSelectStatus('all')}
          >
            <div className="hstat-val">{stats.total}</div>
            <div className="hstat-lbl">Total</div>
          </div>
          <div
            className={`hstat ${activeStatus === 'open' ? 'active' : ''}`}
            onClick={() => onSelectStatus('open')}
          >
            <div className="hstat-val" style={{ color: 'var(--critical)' }}>
              {stats.open}
            </div>
            <div className="hstat-lbl">Open</div>
          </div>
          <div
            className={`hstat ${activeStatus === 'in_progress' ? 'active' : ''}`}
            onClick={() => onSelectStatus('in_progress')}
          >
            <div className="hstat-val" style={{ color: 'var(--accent)' }}>
              {stats.in_progress}
            </div>
            <div className="hstat-lbl">In Progress</div>
          </div>
          <div
            className={`hstat ${activeStatus === 'resolved' ? 'active' : ''}`}
            onClick={() => onSelectStatus('resolved')}
          >
            <div className="hstat-val" style={{ color: 'var(--low)' }}>
              {stats.resolved}
            </div>
            <div className="hstat-lbl">Resolved</div>
          </div>
        </div>

        <button className="theme-toggle-btn" onClick={onToggleTheme} title="Toggle theme">
          {theme === 'dark' ? (
            <>
              <Sun size={15} /> <span>Light</span>
            </>
          ) : (
            <>
              <Moon size={15} /> <span>Dark</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
