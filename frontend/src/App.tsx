import React, { useEffect, useState, useMemo } from 'react';
import { DashboardStats, Issue } from './types';
import { fetchIssues, fetchStats } from './services/api';
import { Navbar } from './components/Navbar';
import { Toolbar } from './components/Toolbar';
import { IssueCard } from './components/IssueCard';
import { SolutionsModal } from './components/SolutionsModal';
import { StatusModal } from './components/StatusModal';
import { ResolveModal } from './components/ResolveModal';
import { LightboxModal } from './components/LightboxModal';

export const App: React.FC = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
  });
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('iris_theme') as 'dark' | 'light') || 'dark';
  });

  const [activeSeverity, setActiveSeverity] = useState('all');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeStatus, setActiveStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [solutionsIssue, setSolutionsIssue] = useState<Issue | null>(null);
  const [statusIssue, setStatusIssue] = useState<Issue | null>(null);
  const [resolveIssue, setResolveIssue] = useState<Issue | null>(null);
  const [lightboxData, setLightboxData] = useState<{ url: string; caption: string } | null>(null);

  const loadData = async () => {
    try {
      const [fetchedIssues, fetchedStats] = await Promise.all([fetchIssues(), fetchStats()]);
      setIssues(fetchedIssues);
      setStats(fetchedStats);
    } catch (e) {
      console.error('Error loading data:', e);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('iris_theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Filtered issues
  const filteredIssues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return issues.filter((issue) => {
      // Severity
      const sev = (issue.severity_level || '').toLowerCase();
      if (activeSeverity !== 'all' && sev !== activeSeverity) return false;

      // Category
      const cat = (issue.ai_category || '').toLowerCase();
      if (activeCategory !== 'all' && !cat.includes(activeCategory)) return false;

      // Status
      const stat = (issue.status || 'open').toLowerCase().replace(' ', '_');
      if (activeStatus !== 'all' && stat !== activeStatus) return false;

      // Search
      if (q) {
        const text = `${issue.representative_issue || ''} ${issue.place || ''} ${issue.first_raiser_name || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      return true;
    });
  }, [issues, activeSeverity, activeCategory, activeStatus, searchQuery]);

  return (
    <div>
      <Navbar
        stats={stats}
        theme={theme}
        onToggleTheme={toggleTheme}
        activeStatus={activeStatus}
        onSelectStatus={setActiveStatus}
      />

      <Toolbar
        activeSeverity={activeSeverity}
        onSelectSeverity={setActiveSeverity}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main>
        {filteredIssues.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.6 }}>🔍</div>
            <p>No complaints match your current filters.</p>
            <button
              className="btn"
              style={{ maxWidth: 160, margin: '12px auto 0' }}
              onClick={() => {
                setActiveSeverity('all');
                setActiveCategory('all');
                setActiveStatus('all');
                setSearchQuery('');
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid">
            {filteredIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                onOpenSolutions={setSolutionsIssue}
                onOpenResolve={setResolveIssue}
                onOpenStatus={setStatusIssue}
                onOpenLightbox={(url, caption) => setLightboxData({ url, caption })}
              />
            ))}
          </div>
        )}
      </main>

      <SolutionsModal issue={solutionsIssue} onClose={() => setSolutionsIssue(null)} />

      <StatusModal
        issue={statusIssue}
        onClose={() => setStatusIssue(null)}
        onUpdated={loadData}
      />

      <ResolveModal
        issue={resolveIssue}
        onClose={() => setResolveIssue(null)}
        onResolved={loadData}
      />

      <LightboxModal
        imageUrl={lightboxData?.url || null}
        caption={lightboxData?.caption || ''}
        onClose={() => setLightboxData(null)}
      />
    </div>
  );
};
