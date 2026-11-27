import React from 'react';
import { DashboardStats } from '../types';
import { Sun, Moon, LayoutGrid, Flame, Sparkles } from 'lucide-react';

interface NavbarProps {
  stats: DashboardStats;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  activeStatus: string;
  onSelectStatus: (status: string) => void;
  activeTab: 'all' | 'top_tickets' | 'top_solutions';
  onSelectTab: (tab: 'all' | 'top_tickets' | 'top_solutions') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  stats,
  theme,
  onToggleTheme,
  activeStatus,
  onSelectStatus,
  activeTab,
  onSelectTab,
}) => {
  return (
    <header>
      <div className="header-left">
        <div className="logo">
          IRIS <span>Club Dashboard</span>
        </div>

        {/* View Switcher Tabs */}
        <div className="nav-tabs">
          <button
            className={`nav-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => onSelectTab('all')}
          >
            <LayoutGrid size={15} /> All Complaints
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'top_tickets' ? 'active' : ''}`}
            onClick={() => onSelectTab('top_tickets')}
          >
            <Flame size={15} color="#f97316" /> Top Tickets Raised
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'top_solutions' ? 'active' : ''}`}
            onClick={() => onSelectTab('top_solutions')}
          >
            <Sparkles size={15} color="var(--ai)" /> Top Solutions
          </button>
        </div>
      </div>

      <div className="header-right">
        <div className="header-stats">
          <div
            className={`hstat ${activeStatus === 'all' ? 'active' : ''}`}
            onClick={() => {
              onSelectTab('all');
              onSelectStatus('all');
            }}
          >
            <div className="hstat-val">{stats.total}</div>
            <div className="hstat-lbl">Total</div>
          </div>
          <div
            className={`hstat ${activeStatus === 'open' ? 'active' : ''}`}
            onClick={() => {
              onSelectTab('all');
              onSelectStatus('open');
            }}
          >
            <div className="hstat-val" style={{ color: 'var(--critical)' }}>
              {stats.open}
            </div>
            <div className="hstat-lbl">Open</div>
          </div>
          <div
            className={`hstat ${activeStatus === 'in_progress' ? 'active' : ''}`}
            onClick={() => {
              onSelectTab('all');
              onSelectStatus('in_progress');
            }}
          >
            <div className="hstat-val" style={{ color: 'var(--accent)' }}>
              {stats.in_progress}
            </div>
            <div className="hstat-lbl">In Progress</div>
          </div>
          <div
            className={`hstat ${activeStatus === 'resolved' ? 'active' : ''}`}
            onClick={() => {
              onSelectTab('all');
              onSelectStatus('resolved');
            }}
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
