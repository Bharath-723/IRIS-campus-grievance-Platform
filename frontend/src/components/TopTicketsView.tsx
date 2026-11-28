import React from 'react';
import { Issue } from '../types';
import { Trophy, Flame, MapPin, Award, CheckCircle, Clock, Gift } from 'lucide-react';

interface TopTicketsViewProps {
  issues: Issue[];
  onOpenSolutions: (issue: Issue) => void;
  onOpenResolve: (issue: Issue) => void;
  onOpenStatus: (issue: Issue) => void;
  onIssueReward: (issueId: number) => void;
}

function getCategoryIcon(cat?: string): string {
  if (!cat) return '📌';
  const c = cat.toLowerCase();
  if (c.includes('infra')) return '🏢';
  if (c.includes('hygiene') || c.includes('clean')) return '🧹';
  if (c.includes('tech') || c.includes('wifi') || c.includes('lab')) return '💻';
  if (c.includes('safe') || c.includes('electric')) return '⚠';
  if (c.includes('admin')) return '📋';
  return '📌';
}

function getRankBadge(rank: number) {
  if (rank === 1) return { label: '👑 #1 Most Repeated', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.2)' };
  if (rank === 2) return { label: '🥈 #2 Most Repeated', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.2)' };
  if (rank === 3) return { label: '🥉 #3 Most Repeated', color: '#d97706', bg: 'rgba(217, 119, 6, 0.2)' };
  return { label: `#${rank} Ranked`, color: 'var(--text-muted)', bg: 'var(--surface3)' };
}

export const TopTicketsView: React.FC<TopTicketsViewProps> = ({
  issues,
  onOpenSolutions,
  onOpenResolve,
  onOpenStatus,
  onIssueReward,
}) => {
  const handleIssueRewardClick = (issue: Issue) => {
    const recipient = issue.first_raiser_name || 'this student';
    const confirmed = window.confirm(
      `Issue First-Raiser Consensus Reward to ${recipient} for "${issue.representative_issue}"?\n\nThis will officially award the student and move them to Previous Winners. The card will be removed from Top Tickets.`
    );
    if (confirmed) {
      onIssueReward(issue.id);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* View Header Banner */}
      <div className="top-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="trophy-icon-box">
            <Flame size={28} color="#f59e0b" />
          </div>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
              🔥 Top Tickets Raised (Consensus Priorities)
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              Ranked by total reports from students across campus. The very first student who raised each recurring issue is highlighted below to receive the <strong>First-Raiser Recognition Reward</strong>!
            </p>
          </div>
        </div>
      </div>

      {/* Top 10 List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {issues.slice(0, 10).map((issue, idx) => {
          const rank = idx + 1;
          const rankInfo = getRankBadge(rank);
          const hasRaiserName = Boolean(issue.first_raiser_name && !issue.first_raiser_name.toLowerCase().includes('anonymous'));
          const hasRaiserEmail = Boolean(issue.first_raiser_email && !issue.first_raiser_email.endsWith('@campus.local'));

          return (
            <div key={issue.id} className="top-ticket-card">
              <div className="ticket-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      background: rankInfo.bg,
                      color: rankInfo.color,
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontWeight: 700,
                      fontSize: 12,
                      border: `1px solid ${rankInfo.color}`,
                    }}
                  >
                    {rankInfo.label}
                  </span>

                  <span className="freq-pill">
                    <Flame size={13} color="#f97316" /> {issue.frequency} report(s) from students
                  </span>

                  {issue.ai_category && (
                    <span className="category-pill">
                      {getCategoryIcon(issue.ai_category)} {issue.ai_category}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {rank === 1 && (
                    <button
                      className="btn-issue-reward"
                      onClick={() => handleIssueRewardClick(issue)}
                      title="Issue official reward to this student and move to Previous Winners"
                    >
                      <Gift size={13} /> Issue Reward
                    </button>
                  )}

                  <div className="status-dot">
                    <div className={`dot dot-${issue.status || 'open'}`} />
                    {(issue.status || 'open').replace('_', ' ')}
                  </div>
                </div>
              </div>

              {/* Problem Description */}
              <div style={{ margin: '14px 0' }}>
                <div style={{ fontSize: 13, color: 'var(--accent2)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <MapPin size={14} /> {issue.place || 'Campus'}
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', lineHeight: 1.4 }}>
                  {issue.representative_issue}
                </h3>
              </div>

              {/* 🏆 First Raiser Reward Spotlight Box */}
              <div className="reward-spotlight-box">
                <div className="reward-badge-pill">
                  <Trophy size={14} color="#f59e0b" />
                  <span>🏆 FIRST RAISER REWARD WINNER</span>
                </div>

                <div className="reward-content">
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                      Award Recipient (First Submitted By)
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>
                      {hasRaiserName ? issue.first_raiser_name : 'Anonymous Person (Unclaimed Reward)'}
                    </div>
                    {hasRaiserEmail && (
                      <div style={{ fontSize: 13, color: 'var(--accent)', marginTop: 2 }}>
                        ✉ {issue.first_raiser_email}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>
                    {rank === 1 && (
                      <button
                        className="btn-issue-reward-prominent"
                        onClick={() => handleIssueRewardClick(issue)}
                        style={{ marginBottom: 6 }}
                      >
                        <Gift size={13} /> Issue Reward to Student
                      </button>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                      <Clock size={13} /> First reported
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--text)', marginTop: 2 }}>
                      {issue.created_at ? new Date(issue.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Earlier'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button className="btn" onClick={() => onOpenSolutions(issue)}>
                  Solutions ({issue.total_solutions || 0})
                </button>
                <button className="btn btn-resolve" onClick={() => onOpenResolve(issue)}>
                  ✓ Resolve Issue
                </button>
                <button className="btn btn-primary" onClick={() => onOpenStatus(issue)}>
                  Update Status
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
