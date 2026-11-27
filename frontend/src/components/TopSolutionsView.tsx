import React from 'react';
import { TopSolution } from '../types';
import { Crown, Sparkles, Award, CheckCircle, ThumbsUp, Star } from 'lucide-react';

interface TopSolutionsViewProps {
  winner: TopSolution | null;
  solutions: TopSolution[];
  onMarkUnique: (id: number) => void;
}

export const TopSolutionsView: React.FC<TopSolutionsViewProps> = ({
  winner,
  solutions,
  onMarkUnique,
}) => {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Banner */}
      <div className="top-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="trophy-icon-box" style={{ background: 'var(--ai-bg)', borderColor: 'var(--ai)' }}>
            <Sparkles size={28} color="var(--ai)" />
          </div>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
              💡 Top Solutions & AI Contribution Winner
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              Crowd-sourced student solutions evaluated by AI for feasibility, impact, and safety. Below is the <strong>Top 1 Winner</strong> chosen by AI and the <strong>Top 10 Solutions</strong>!
            </p>
          </div>
        </div>
      </div>

      {/* 👑 AI Best Solution Winner Spotlight Card */}
      {winner && (
        <div className="winner-spotlight-card">
          <div className="winner-badge">
            <Crown size={16} color="#ffffff" />
            <span>AI GRAND PRIZE WINNER — BEST SOLUTION CONTRIBUTION</span>
          </div>

          <div className="winner-grid">
            <div style={{ flex: 1.5 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>
                Problem Solved (📍 {winner.place})
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>
                "{winner.representative_issue}"
              </h3>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--ai)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>
                  Winning Solution Idea:
                </div>
                <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', marginTop: 4, background: 'var(--surface2)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
                  "{winner.solution_text}"
                </div>
              </div>
            </div>

            <div className="winner-info-card">
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Reward Winner (Student Submitter)
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', marginTop: 4 }}>
                {winner.submitter_name || 'Anonymous Person'}
              </div>
              {winner.submitter_email && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                  ✉ {winner.submitter_email}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
                <span className="score-badge score-high">
                  ★ AI Score: {winner.ai_score || 10}/10
                </span>
                <span style={{ fontSize: 11, color: 'var(--low)', fontWeight: 600 }}>
                  ✓ AI Verified
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top 10 Solutions List */}
      <div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>
          Top 10 Ranked Student Solutions
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {solutions.map((sol, idx) => {
            const rank = idx + 1;
            const isWinner = sol.id === winner?.id;

            return (
              <div key={sol.id} className={`solution-rank-card ${isWinner ? 'is-winner' : ''}`}>
                <div className="solution-rank-num">
                  #{rank}
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent2)' }}>
                      📍 {sol.place}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Issue: <strong>{sol.representative_issue}</strong>
                    </span>
                    {sol.ai_category && (
                      <span className="category-pill" style={{ padding: '2px 8px', fontSize: 11 }}>
                        {sol.ai_category}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>
                    "{sol.solution_text}"
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    <span>By: <strong>{sol.submitter_name || 'Anonymous Person'}</strong> {sol.submitter_email ? `(${sol.submitter_email})` : ''}</span>
                    <span className="score-badge">Score: {sol.ai_score || 5}/10</span>
                    {sol.wants_reward && <span style={{ color: 'var(--accent)', fontWeight: 600 }}>🎁 Reward Eligible</span>}
                    {sol.is_unique && <span style={{ color: 'var(--low)', fontWeight: 600 }}>★ Unique Idea</span>}
                  </div>
                </div>

                {!sol.is_unique && (
                  <button
                    className="btn"
                    style={{ maxWidth: 120, padding: '6px 12px', fontSize: 12 }}
                    onClick={() => onMarkUnique(sol.id)}
                  >
                    Mark Unique
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
