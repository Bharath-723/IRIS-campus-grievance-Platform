import React from 'react';
import { TicketWinner, SolutionWinner, Issue } from '../types';
import { fetchIssueById } from '../services/api';
import { Trophy, Flame, Sparkles, Award, MapPin, Calendar, Mail, ExternalLink, ArrowRight, Gift } from 'lucide-react';

interface PreviousWinnersViewProps {
  ticketWinners: TicketWinner[];
  solutionWinners: SolutionWinner[];
  onInspectIssue: (issue: Issue) => void;
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
  const topTicketWinner = ticketWinners[0] || null;
  const topSolutionWinner = solutionWinners[0] || null;

  const handleInspectSolution = async (sol: SolutionWinner) => {
    try {
      const full = await fetchIssueById(sol.issue_id);
      onInspectIssue(full);
    } catch (e) {
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
              🏆 Previous Winners & Hall of Champions
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              Officially recognized student champions awarded by campus administrators. Displays the <strong>Top 1 Ticket Raiser Winner</strong> (who first raised the most critical consensus issue) and the <strong>Top 1 Solution Winner</strong> (the best crowd-sourced innovation). Click on any winner's name to inspect their full issue card and solutions.
            </p>
          </div>
        </div>
      </div>

      {/* Side-by-Side 2 Grid Layout */}
      <div className="previous-winners-grid">
        {/* ── GRID 1 (Left): Top 1 Ticket Raiser Winner ── */}
        <div className="winner-column">
          <div className="winner-column-header" style={{ borderColor: 'var(--accent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Flame size={20} color="#f97316" />
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>
                Top Ticket Raiser Winner
              </h3>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-bg)', padding: '3px 10px', borderRadius: 12 }}>
              {topTicketWinner ? '👑 Awarded Top 1 Champion' : 'Pending Award'}
            </span>
          </div>

          {!topTicketWinner ? (
            <div className="empty-state" style={{ padding: '36px 20px', background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🎁</div>
              <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                No Ticket Reward Issued Yet
              </h4>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto', lineHeight: 1.5 }}>
                When administrators click <strong>"🎁 Issue Reward"</strong> on the #1 ranked issue in the <em>Top Tickets Raised</em> tab, that student champion will be honored here!
              </p>
            </div>
          ) : (
            (() => {
              const issue = topTicketWinner;
              const reporter = formatReporter(issue.first_raiser_name, issue.first_raiser_email);
              const awardedDate = issue.reward_given_at
                ? new Date(issue.reward_given_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : issue.created_at
                ? new Date(issue.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Recently';

              return (
                <div key={issue.id} className="winner-record-card champion-card">
                  {/* Top Row: Rank & Frequency */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span
                      style={{
                        background: 'linear-gradient(90deg, #f59e0b, #d97706)',
                        color: '#ffffff',
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontWeight: 800,
                        fontSize: 12,
                        letterSpacing: 0.5,
                      }}
                    >
                      👑 #1 FIRST-RAISER CHAMPION
                    </span>
                    <span className="freq-pill">
                      <Flame size={12} color="#f97316" /> {issue.frequency} student report(s)
                    </span>
                  </div>

                  {/* Winner Profile Box */}
                  <div className="winner-profile-row">
                    <div className="winner-avatar" style={{ width: 52, height: 52, fontSize: 18 }}>
                      {reporter.initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                        Awarded First-Raiser
                      </div>

                      {/* Clickable Winner Name */}
                      <button
                        className="winner-name-btn"
                        title="Click to view full issue card & solutions"
                        onClick={() => onInspectIssue(issue)}
                        style={{ fontSize: 18, marginTop: 2 }}
                      >
                        {reporter.name} <ExternalLink size={14} style={{ display: 'inline', marginLeft: 4 }} />
                      </button>

                      {reporter.email && (
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                          <Mail size={13} /> {reporter.email}
                        </div>
                      )}

                      <div style={{ fontSize: 12, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, fontWeight: 700 }}>
                        <Gift size={13} /> Official Reward Awarded: {awardedDate}
                      </div>
                    </div>
                  </div>

                  {/* Grievance Summary */}
                  <div style={{ background: 'var(--surface2)', padding: '14px 16px', borderRadius: 8, marginTop: 14, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, color: 'var(--accent2)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={13} /> {issue.place}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginTop: 4, lineHeight: 1.4 }}>
                      "{issue.representative_issue}"
                    </div>
                  </div>

                  {/* Card Inspector Action Button */}
                  <button
                    className="btn-inspect-issue"
                    onClick={() => onInspectIssue(issue)}
                    style={{ marginTop: 16 }}
                  >
                    Inspect Full Issue Card & Solutions ({issue.total_solutions || 0}) <ArrowRight size={13} />
                  </button>
                </div>
              );
            })()
          )}
        </div>

        {/* ── GRID 2 (Right): Top 1 Solution Winner ── */}
        <div className="winner-column">
          <div className="winner-column-header" style={{ borderColor: 'var(--ai)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={20} color="var(--ai)" />
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>
                Best Solution Winner
              </h3>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ai)', background: 'var(--ai-bg)', padding: '3px 10px', borderRadius: 12 }}>
              {topSolutionWinner ? '👑 Awarded Top 1 Champion' : 'Pending Award'}
            </span>
          </div>

          {!topSolutionWinner ? (
            <div className="empty-state" style={{ padding: '36px 20px', background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>💡</div>
              <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                No Solution Reward Issued Yet
              </h4>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto', lineHeight: 1.5 }}>
                When administrators click <strong>"🎁 Issue Reward"</strong> on the top solution in the <em>Top Solutions</em> tab, that student innovator will be honored here!
              </p>
            </div>
          ) : (
            (() => {
              const sol = topSolutionWinner;
              const reporter = formatReporter(sol.submitter_name, sol.submitter_email);
              const awardedDate = sol.reward_given_at
                ? new Date(sol.reward_given_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : sol.submitted_at
                ? new Date(sol.submitted_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Recently';

              return (
                <div key={sol.id} className="winner-record-card champion-card highlight-grand-winner">
                  {/* Top Row: Rank & Score */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span
                      style={{
                        background: 'linear-gradient(90deg, #a855f7, #f59e0b)',
                        color: '#ffffff',
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontWeight: 800,
                        fontSize: 12,
                        letterSpacing: 0.5,
                      }}
                    >
                      👑 #1 BEST SOLUTION CHAMPION
                    </span>
                    <span className="score-badge score-high" style={{ fontSize: 12, padding: '4px 10px' }}>
                      ★ AI Score: {sol.ai_score ?? 10}/10
                    </span>
                  </div>

                  {/* Winner Profile Box */}
                  <div className="winner-profile-row">
                    <div className="winner-avatar" style={{ width: 52, height: 52, fontSize: 18, borderColor: 'var(--ai)', color: 'var(--ai)' }}>
                      {reporter.initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                        Awarded Solution Innovator
                      </div>

                      {/* Clickable Winner Name */}
                      <button
                        className="winner-name-btn solution-name-btn"
                        title="Click to view full issue card & solutions"
                        onClick={() => handleInspectSolution(sol)}
                        style={{ fontSize: 18, marginTop: 2 }}
                      >
                        {reporter.name} <ExternalLink size={14} style={{ display: 'inline', marginLeft: 4 }} />
                      </button>

                      {reporter.email && (
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                          <Mail size={13} /> {reporter.email}
                        </div>
                      )}

                      <div style={{ fontSize: 12, color: 'var(--ai)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, fontWeight: 700 }}>
                        <Gift size={13} /> Official Reward Awarded: {awardedDate}
                      </div>
                    </div>
                  </div>

                  {/* Winning Solution Idea */}
                  <div style={{ background: 'rgba(168, 85, 247, 0.08)', padding: '14px 16px', borderRadius: 8, marginTop: 14, border: '1.5px solid var(--ai)' }}>
                    <div style={{ fontSize: 11, color: 'var(--ai)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Winning Solution Idea:
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginTop: 4, lineHeight: 1.45, fontStyle: 'italic' }}>
                      "{sol.solution_text}"
                    </div>
                  </div>

                  {/* Problem Solved info */}
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <MapPin size={13} /> For: <strong>{sol.representative_issue}</strong> ({sol.place})
                  </div>

                  {/* Card Inspector Action Button */}
                  <button
                    className="btn-inspect-issue"
                    style={{ borderColor: 'rgba(168, 85, 247, 0.5)', color: 'var(--ai)', marginTop: 16 }}
                    onClick={() => handleInspectSolution(sol)}
                  >
                    Inspect Full Issue Card & Solutions <ArrowRight size={13} />
                  </button>
                </div>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
};
