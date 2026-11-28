import React, { useEffect, useState } from 'react';
import { Issue, Solution } from '../types';
import { fetchSolutions, getImageUrl } from '../services/api';
import { X, MapPin, Calendar, Clock, Flame, Award, Sparkles, CheckCircle2, User, Mail, ShieldCheck, Image as ImageIcon } from 'lucide-react';

interface IssueDetailModalProps {
  issue: Issue | null;
  onClose: () => void;
  onOpenLightbox?: (url: string, title: string) => void;
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

function getInitials(name?: string): string {
  if (!name) return 'AP';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getReporterDisplay(name?: string, email?: string) {
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
    return { initials: 'AP', name: 'Anonymous Person', email: null };
  }
  if (isAnonymousName && realEmail) {
    return { initials: realEmail.slice(0, 2).toUpperCase(), name: realEmail, email: null };
  }
  if (!isAnonymousName && !realEmail) {
    return { initials: getInitials(cleanName), name: cleanName, email: null };
  }
  return { initials: getInitials(cleanName), name: cleanName, email: realEmail };
}

export const IssueDetailModal: React.FC<IssueDetailModalProps> = ({
  issue,
  onClose,
  onOpenLightbox,
}) => {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!issue) return;
    setLoading(true);
    fetchSolutions(issue.id)
      .then(setSolutions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [issue]);

  if (!issue) return null;

  const imageUrl = getImageUrl(issue.media_url);
  const reporter = getReporterDisplay(issue.first_raiser_name, issue.first_raiser_email);
  const sevKey = (issue.severity_level || 'low').toLowerCase();

  return (
    <div className="modal-bg" onClick={onClose}>
      <div
        className="modal-card issue-detail-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 760, maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="modal-head" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="trophy-icon-box" style={{ width: 38, height: 38, borderRadius: 8 }}>
              <Award size={20} color="var(--accent)" />
            </span>
            <div>
              <div className="modal-title" style={{ fontSize: 18 }}>
                Full Grievance Card & Solutions
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Issue #{issue.id} · 📍 {issue.place}
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 16 }}>
          {/* Card Media Preview (if available) */}
          {imageUrl && (
            <div
              style={{
                width: '100%',
                maxHeight: 240,
                borderRadius: 10,
                overflow: 'hidden',
                position: 'relative',
                background: 'var(--surface2)',
                cursor: onOpenLightbox ? 'pointer' : 'default',
                border: '1px solid var(--border)',
              }}
              onClick={() => onOpenLightbox && onOpenLightbox(imageUrl, `${issue.representative_issue} — ${issue.place}`)}
            >
              <img
                src={imageUrl}
                alt={issue.representative_issue}
                style={{ width: '100%', maxHeight: 240, objectFit: 'cover', display: 'block' }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              {onOpenLightbox && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    background: 'rgba(0,0,0,0.75)',
                    color: '#fff',
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <ImageIcon size={12} /> View Full Photo
                </div>
              )}
            </div>
          )}

          {/* Badges & Meta */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className={`badge badge-${sevKey}`}>
                {issue.severity_level.toUpperCase()}
              </span>
              {issue.ai_category && (
                <span className="category-pill">
                  {getCategoryIcon(issue.ai_category)} {issue.ai_category}
                </span>
              )}
              <span className="freq-pill">
                <Flame size={13} color="#f97316" /> {issue.frequency || 1} report(s)
              </span>
            </div>

            <div className="status-dot">
              <div className={`dot dot-${issue.status || 'open'}`} />
              {(issue.status || 'open').replace('_', ' ')}
            </div>
          </div>

          {/* Issue Statement */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent2)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={14} /> {issue.place}
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginTop: 4, lineHeight: 1.35 }}>
              {issue.representative_issue}
            </h2>
          </div>

          {/* Meta Details Pills */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)' }}>
            {issue.issue_duration && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Clock size={14} /> Duration: <strong>{issue.issue_duration}</strong>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Calendar size={14} /> Open: <strong>{issue.days_open || 0} days</strong>
            </div>
            {issue.created_at && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Calendar size={14} /> Submitted:{' '}
                <strong>
                  {new Date(issue.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </strong>
              </div>
            )}
          </div>

          {/* First Raiser Winner Profile Box */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.04) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.5)',
              borderRadius: 10,
              padding: '14px 18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              <Award size={15} /> First-Raiser Consensus Winner Information
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'var(--surface3)',
                  border: '2px solid var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--accent)',
                  flexShrink: 0,
                }}
              >
                {reporter.initials}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                  {reporter.name}
                </div>
                {reporter.email ? (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                    <Mail size={13} /> {reporter.email}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>
                    No personal email provided (Anonymous Submission)
                  </div>
                )}
                {issue.created_at && (
                  <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 4, fontWeight: 600 }}>
                    First raised on {new Date(issue.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Solutions Section */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={17} color="var(--ai)" />
                Associated Solutions ({solutions.length})
              </h3>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Evaluated for feasibility & reward
              </span>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                Loading crowd-sourced solutions...
              </div>
            ) : solutions.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '24px 16px',
                  background: 'var(--surface2)',
                  borderRadius: 8,
                  border: '1px dashed var(--border)',
                  color: 'var(--text-muted)',
                  fontSize: 13,
                }}
              >
                No solutions have been submitted yet for this issue.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {solutions.map((sol, index) => {
                  const isTopAi = sol.ai_selected || sol.ai_score === 10;
                  return (
                    <div
                      key={sol.id}
                      style={{
                        background: isTopAi ? 'rgba(168, 85, 247, 0.08)' : 'var(--surface2)',
                        border: isTopAi ? '1.5px solid var(--ai)' : '1px solid var(--border)',
                        borderRadius: 8,
                        padding: '12px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
                            {sol.submitter_name || 'Anonymous Contributor'}
                          </span>
                          {sol.submitter_email && !sol.submitter_email.endsWith('@campus.local') && (
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              ({sol.submitter_email})
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {sol.ai_score !== undefined && (
                            <span
                              className={`score-badge ${sol.ai_score >= 8 ? 'score-high' : ''}`}
                              style={{ fontSize: 11 }}
                            >
                              ★ Score: {sol.ai_score}/10
                            </span>
                          )}
                          {isTopAi && (
                            <span
                              style={{
                                background: 'var(--ai-bg)',
                                color: 'var(--ai)',
                                fontSize: 10,
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: 4,
                                border: '1px solid var(--ai)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3,
                              }}
                            >
                              <Sparkles size={11} /> AI Top Pick
                            </span>
                          )}
                          {sol.is_unique && (
                            <span
                              style={{
                                background: 'var(--accent-bg)',
                                color: 'var(--accent)',
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: 4,
                              }}
                            >
                              Unique
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.45, marginTop: 2 }}>
                        "{sol.solution_text}"
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        <span>
                          {sol.submitted_at
                            ? `Submitted on ${new Date(sol.submitted_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}`
                            : 'Submitted'}
                        </span>
                        {sol.wants_reward && (
                          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                            🎁 Solution Reward Participant
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
