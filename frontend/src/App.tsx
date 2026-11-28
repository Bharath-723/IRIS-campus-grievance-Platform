import React, { useEffect, useState, useMemo } from 'react';
import { DashboardStats, Issue, ResolvedIssue, TopSolution, WinnersData } from './types';
import { fetchIssues, fetchStats, fetchTopIssues, fetchTopSolutions, fetchResolvedIssues, fetchWinners, markSolutionUnique, issueTicketReward, issueSolutionReward } from './services/api';
import { Navbar } from './components/Navbar';
import { Toolbar } from './components/Toolbar';
import { IssueCard } from './components/IssueCard';
import { TopTicketsView } from './components/TopTicketsView';
import { TopSolutionsView } from './components/TopSolutionsView';
import { ResolvedIssuesView } from './components/ResolvedIssuesView';
import { PreviousWinnersView } from './components/PreviousWinnersView';
import { IssueDetailModal } from './components/IssueDetailModal';
import { SolutionsModal } from './components/SolutionsModal';
import { StatusModal } from './components/StatusModal';
import { ResolveModal } from './components/ResolveModal';
import { LightboxModal } from './components/LightboxModal';

export const App: React.FC = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [topIssues, setTopIssues] = useState<Issue[]>([]);
  const [resolvedIssues, setResolvedIssues] = useState<ResolvedIssue[]>([]);
  const [winnersData, setWinnersData] = useState<WinnersData>({
    ticket_winners: [],
    solution_winners: [],
  });
  const [topSolutionsData, setTopSolutionsData] = useState<{
    winner: TopSolution | null;
    solutions: TopSolution[];
  }>({ winner: null, solutions: [] });

  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('iris_theme') as 'dark' | 'light') || 'dark';
  });

  const [activeTab, setActiveTab] = useState<'all' | 'top_tickets' | 'top_solutions' | 'resolved' | 'previous_winners'>('all');
  const [activeSeverity, setActiveSeverity] = useState('all');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeStatus, setActiveStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [solutionsIssue, setSolutionsIssue] = useState<Issue | null>(null);
  const [statusIssue, setStatusIssue] = useState<Issue | null>(null);
  const [resolveIssue, setResolveIssue] = useState<Issue | null>(null);
  const [inspectIssue, setInspectIssue] = useState<Issue | null>(null);
  const [lightboxData, setLightboxData] = useState<{ url: string; caption: string } | null>(null);

  const loadData = async () => {
    try {
      const [fetchedIssues, fetchedStats, fetchedTopIssues, fetchedTopSolutions, fetchedResolved, fetchedWinners] = await Promise.all([
        fetchIssues(),
        fetchStats(),
        fetchTopIssues(),
        fetchTopSolutions(),
        fetchResolvedIssues(),
        fetchWinners(),
      ]);
      setIssues(fetchedIssues);
      setStats(fetchedStats);
      setTopIssues(fetchedTopIssues);
      setTopSolutionsData(fetchedTopSolutions);
      setResolvedIssues(fetchedResolved);
      setWinnersData(fetchedWinners);
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

  const handleMarkUniqueSolution = async (id: number) => {
    try {
      await markSolutionUnique(id);
      setTopSolutionsData((prev) => ({
        ...prev,
        solutions: prev.solutions.map((s) => (s.id === id ? { ...s, is_unique: true } : s)),
        winner: prev.winner && prev.winner.id === id ? { ...prev.winner, is_unique: true } : prev.winner,
      }));
    } catch (e) {
      alert('Failed to mark unique: ' + e);
    }
  };

  const handleIssueTicketReward = async (issueId: number) => {
    try {
      await issueTicketReward(issueId);
      alert('🎉 First-Raiser Consensus Reward successfully issued! The ticket has moved to Previous Winners.');
      await loadData();
    } catch (e) {
      alert('Failed to issue ticket reward: ' + e);
    }
  };

  const handleIssueSolutionReward = async (solutionId: number) => {
    try {
      await issueSolutionReward(solutionId);
      alert('🎉 Best Solution Contribution Reward successfully issued! The solution has moved to Previous Winners.');
      await loadData();
    } catch (e) {
      alert('Failed to issue solution reward: ' + e);
    }
  };

  // Filtered issues for Main Active Tickets view (excludes resolved tickets)
  const filteredIssues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return issues.filter((issue) => {
      // 1. Remove resolved complaints from main active grid
      const stat = (issue.status || 'open').toLowerCase().replace(' ', '_');
      if (stat === 'resolved') return false;

      // 2. Severity
      const sev = (issue.severity_level || '').toLowerCase();
      if (activeSeverity !== 'all' && sev !== activeSeverity) return false;

      // 3. Category
      const cat = (issue.ai_category || '').toLowerCase();
      if (activeCategory !== 'all' && !cat.includes(activeCategory)) return false;

      // 4. Status filter (e.g. open vs in_progress)
      if (activeStatus !== 'all' && stat !== activeStatus) return false;

      // 5. Search
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
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      {activeTab === 'all' && (
        <Toolbar
          activeSeverity={activeSeverity}
          onSelectSeverity={setActiveSeverity}
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      )}

      <main style={{ paddingTop: 24, paddingBottom: 40 }}>
        {activeTab === 'all' && (
          filteredIssues.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.6 }}>🔍</div>
              <p>No active complaints match your current filters.</p>
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
          )
        )}

        {activeTab === 'top_tickets' && (
          <TopTicketsView
            issues={topIssues}
            onOpenSolutions={setSolutionsIssue}
            onOpenResolve={setResolveIssue}
            onOpenStatus={setStatusIssue}
            onIssueReward={handleIssueTicketReward}
          />
        )}

        {activeTab === 'top_solutions' && (
          <TopSolutionsView
            winner={topSolutionsData.winner}
            solutions={topSolutionsData.solutions}
            onMarkUnique={handleMarkUniqueSolution}
            onIssueReward={handleIssueSolutionReward}
          />
        )}

        {activeTab === 'resolved' && (
          <ResolvedIssuesView
            issues={resolvedIssues}
            onOpenLightbox={(url, caption) => setLightboxData({ url, caption })}
          />
        )}

        {activeTab === 'previous_winners' && (
          <PreviousWinnersView
            ticketWinners={winnersData.ticket_winners}
            solutionWinners={winnersData.solution_winners}
            onInspectIssue={setInspectIssue}
          />
        )}
      </main>

      <IssueDetailModal
        issue={inspectIssue}
        onClose={() => setInspectIssue(null)}
        onOpenLightbox={(url, caption) => setLightboxData({ url, caption })}
      />

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
