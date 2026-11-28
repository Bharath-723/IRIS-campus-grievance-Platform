import React from 'react';
import { TicketWinner, SolutionWinner, Issue } from '../types';
import { fetchIssueById } from '../services/api';
import { Trophy, Flame, Sparkles, Award, MapPin, Calendar, Mail, User, ArrowRight, ExternalLink } from 'lucide-react';

interface PreviousWinnersViewProps {
  ticketWinners: TicketWinner[];
  solutionWinners: SolutionWinner[];
  onInspectIssue: (issue: Issue) => void;
}

function getRankBadge(rank: number) {
  if (rank === 1) return { label: '👑 #1 First-Raiser Winner', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.2)' };
  if (rank === 2) return { label: '🥈 #2 Consensus Winner', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.2)' };
  if (rank === 3) return { label: '🥉 #3 Consensus Winner', color: '#d97706', bg: 'rgba(217, 119, 6, 0.2)' };
  return { label: `#${rank} Ranked Winner`, color: 'var(--text-muted)', bg: 'var(--surface3)' };
}

function getSolutionRankBadge(rank: number, isAiSelected?: boolean) {
  if (isAiSelected || rank === 1) {
    return { label: '👑 AI Grand Prize Winner', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.2)' };
  }
  if (rank === 2) return { label: '🥈 #2 Best Solution', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.2)' };
  if (rank === 3) return { label: '🥉 #3 Best Solution', color: '#d97706', bg: 'rgba(217, 119, 6, 0.2)' };
  return { label: `#${rank} Solution Winner`, color: 'var(--text-muted)', bg: 'var(--surface3)' };
}

function getInitials(name?: string): string {
  if (!name) return 'AP';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatReporter(name?: string, email?: string) {
  const cleanName = (name || '').trim();
  const rawEmail = (email || '').trim();

  const isAnonymousName =
    !cleanName ||
    cleanName.toLowerCase() === 'anonymous' ||
    cleanName.toLowerCase() === 'anonymous student' ||
    cleanName.toLowerCase() === 'anonymous person' ||
    cleanName.toLowerCase() === 'none';

  const isFakeEmail =
    !rawEmail ||
    rawEmail.toLowerCase() === 'none' ||
    rawEmail.endsWith('@campus.local') ||
    rawEmail.toLowerCase().includes('anonymous') ||
    rawEmail.toLowerCase() === cleanName.toLowerCase();

  const realEmail = isFakeEmail ? null : rawEmail;

  if (isAnonymousName && !realEmail) {
    return { initials: 'AP', name: 'Anonymous Student', email: null };
  }
  if (isAnonymousName && realEmail) {
    return { initials: realEmail.slice(0, 2).toUpperCase(), name: realEmail, email: null };
  }
  if (!isAnonymousName && !realEmail) {
    return { initials: getInitials(cleanName), name: cleanName, email: null };
  }
  return { initials: getInitials(cleanName), name: cleanName, email: realEmail };
}

export const PreviousWinnersView: React.FC<PreviousWinnersViewProps> = ({
  ticketWinners,
  solutionWinners,
  onInspectIssue,
}) => {
  const handleInspectSolution = async (sol: SolutionWinner) => {
    try {
      const full = await fetchIssueById(sol.issue_id);
      onInspectIssue(full);
    } catch (e) {
      // Fallback: construct issue from sol properties
      onInspectIssue({
        id: sol.issue_id,
        place: sol.place,
        representative_issue: sol.representative_issue,
        severity_level: sol.severity_level,
        frequency: 1,
        media_url: sol.media_url,
        first_raiser_name: sol.first_raiser_name,
        first_raiser_email: sol.first_raiser_email,
        created_at: sol.issue_created_at,
        status: 'open',
        days_open: 0,
        total_solutions: 1,
        reward_seekers: 1,
        ai_category: sol.ai_category,
      });
    }
  };

  return (
    <div style={{ maxWidth: 1260, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Banner */}
      <div className="top-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="trophy-icon-box" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(168, 85, 247, 0.2))', borderColor: 'var(--accent)' }}>
            <Trophy size={30} color="#f59e0b" />
          </div>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
              🏆 Hall of Winners & Reward Achievers
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              Honoring student champions across two categories: <strong>Top Ticket Raiser Winners</strong> (who first surfaced recurring issues) and <strong>Best Solution Winners</strong> (top crowd-sourced solutions). Click on any winner's name to inspect their full issue card and solutions.
            </p>
          </div>
        </div>
      </div>

      {/* Side-by-Side 2 Grid Layout */}
      <div className="previous-winners-grid">
        {/* ── GRID 1 (Left): Top Ticket Raiser Winners ── */}
        <div className="winner-column">
          <div className="winner-column-header" style={{ borderColor: 'var(--accent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Flame size={20} color="#f97316" />
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>
                Top Ticket Raiser Winners
              </h3>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-bg)', padding: '2px 8px', borderRadius: 12 }}>
              Consensus First-Raisers ({ticketWinners.length})
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {ticketWinners.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>
                <p>No ticket raiser winners found yet.</p>
              </div>
            ) : (
              ticketWinners.map((issue, idx) => {
                const rank = idx + 1;
                const badge = getRankBadge(rank);
                const reporter = formatReporter(issue.first_raiser_name, issue.first_raiser_email);
                const formattedDate = issue.created_at
                  ? new Date(issue.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Earlier';

                return (
                  <div key={issue.id} className="winner-record-card">
                    {/* Top Row: Rank & Frequency */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span
                        style={{
                          background: badge.bg,
                          color: badge.color,
                          padding: '3px 8px',
                          borderRadius: 20,
                          fontWeight: 700,
                          fontSize: 11,
                          border: `1px solid ${badge.color}`,
                        }}
                      >
                        {badge.label}
                      </span>
                      <span className="freq-pill">
                        <Flame size={12} color="#f97316" /> {issue.frequency} student report(s)
                      </span>
                    </div>

                    {/* Winner Details Box */}
                    <div className="winner-profile-row">
                      <div className="winner-avatar">{reporter.initials}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                          First Raiser Winner
                        </div>

                        {/* Clickable Winner Name */}
                        <button
                          className="winner-name-btn"
                          title="Click to view full issue card & solutions"
                          onClick={() => onInspectIssue(issue)}
                        >
                          {reporter.name} <ExternalLink size={13} style={{ display: 'inline', marginLeft: 3 }} />
                        </button>

                        {reporter.email && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <Mail size={12} /> {reporter.email}
                          </div>
                        )}

                        <div style={{ fontSize: 11, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontWeight: 600 }}>
                          <Calendar size={12} /> Raised on: {formattedDate}
                        </div>
                      </div>
                    </div>

                    {/* Grievance Summary */}
                    <div style={{ background: 'var(--surface2)', padding: '10px 12px', borderRadius: 8, marginTop: 10, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 11, color: 'var(--accent2)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={12} /> {issue.place}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>
                        "{issue.representative_issue}"
                      </div>
                    </div>

                    {/* Card Inspector Action Button */}
                    <button
                      className="btn-inspect-issue"
                      onClick={() => onInspectIssue(issue)}
                    >
                      Inspect Full Issue Card & Solutions ({issue.total_solutions || 0}) <ArrowRight size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── GRID 2 (Right): Best Solution Contribution Winners ── */}
        <div className="winner-column">
          <div className="winner-column-header" style={{ borderColor: 'var(--ai)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={20} color="var(--ai)" />
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>
                Best Solution Winners
              </h3>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ai)', background: 'var(--ai-bg)', padding: '2px 8px', borderRadius: 12 }}>
              AI & Club Evaluated ({solutionWinners.length})
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {solutionWinners.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>
                <p>No solution winners found yet.</p>
              </div>
            ) : (
              solutionWinners.map((sol, idx) => {
                const rank = idx + 1;
                const isGrandWinner = sol.ai_selected || rank === 1;
                const badge = getSolutionRankBadge(rank, sol.ai_selected);
                const reporter = formatReporter(sol.submitter_name, sol.submitter_email);
                const formattedDate = sol.submitted_at
                  ? new Date(sol.submitted_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Earlier';

                return (
                  <div
                    key={sol.id}
                    className={`winner-record-card ${isGrandWinner ? 'highlight-grand-winner' : ''}`}
                  >
                    {/* Top Row: Rank & Score */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span
                        style={{
                          background: badge.bg,
                          color: badge.color,
                          padding: '3px 8px',
                          borderRadius: 20,
                          fontWeight: 700,
                          fontSize: 11,
                          border: `1px solid ${badge.color}`,
                        }}
                      >
                        {badge.label}
                      </span>
                      <span className={`score-badge ${(sol.ai_score ?? 0) >= 8 ? 'score-high' : ''}`}>
                        ★ AI Score: {sol.ai_score ?? 10}/10
                      </span>
                    </div>

                    {/* Winner Details Box */}
                    <div className="winner-profile-row">
                      <div className="winner-avatar" style={{ borderColor: 'var(--ai)', color: 'var(--ai)' }}>
                        {reporter.initials}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                          Solution Contributor Winner
                        </div>

                        {/* Clickable Winner Name */}
                        <button
                          className="winner-name-btn solution-name-btn"
                          title="Click to view full issue card & solutions"
                          onClick={() => handleInspectSolution(sol)}
                        >
                          {reporter.name} <ExternalLink size={13} style={{ display: 'inline', marginLeft: 3 }} />
                        </button>

                        {reporter.email && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <Mail size={12} /> {reporter.email}
                          </div>
                        )}

                        <div style={{ fontSize: 11, color: 'var(--ai)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontWeight: 600 }}>
                          <Calendar size={12} /> Submitted on: {formattedDate}
                        </div>
                      </div>
                    </div>

                    {/* Winning Solution Idea */}
                    <div style={{ background: isGrandWinner ? 'rgba(168, 85, 247, 0.08)' : 'var(--surface2)', padding: '10px 12px', borderRadius: 8, marginTop: 10, border: isGrandWinner ? '1px solid var(--ai)' : '1px solid var(--border)' }}>
                      <div style={{ fontSize: 11, color: 'var(--ai)', fontWeight: 700, textTransform: 'uppercase' }}>
                        Winning Solution Idea:
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginTop: 2, fontStyle: 'italic' }}>
                        "{sol.solution_text}"
                      </div>
                    </div>

                    {/* Problem Solved info */}
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={11} /> For: <strong>{sol.representative_issue}</strong> ({sol.place})
                    </div>

                    {/* Card Inspector Action Button */}
                    <button
                      className="btn-inspect-issue"
                      style={{ borderColor: 'rgba(168, 85, 247, 0.4)', color: 'var(--ai)' }}
                      onClick={() => handleInspectSolution(sol)}
                    >
                      Inspect Full Issue Card & Solutions <ArrowRight size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
