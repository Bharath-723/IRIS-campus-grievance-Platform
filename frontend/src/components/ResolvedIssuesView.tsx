import React, { useState, useMemo } from 'react';
import { ResolvedIssue } from '../types';
import { getImageUrl } from '../services/api';
import { CheckCircle2, MapPin, Calendar, UserCheck, ShieldCheck, Image as ImageIcon, Video, User, Mail, Clock, X, ExternalLink, Award, Search, Filter } from 'lucide-react';

interface ResolvedIssuesViewProps {
  issues: ResolvedIssue[];
  onOpenLightbox: (imageUrl: string, title: string) => void;
}

export type ResolvedTimeFilter =
  | 'all'
  | 'today'
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'last_year';

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

function matchesTimeFilter(issue: ResolvedIssue, filter: ResolvedTimeFilter): boolean {
  if (filter === 'all') return true;

  const dateStr = issue.resolved_at || issue.created_at;
  if (!dateStr) return true;
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (filter === 'today') {
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  }

  if (filter === 'this_month') {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }

  if (filter === 'last_month') {
    const targetMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const targetYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
  }

  if (filter === 'last_3_months') {
    return diffDays <= 90;
  }

  if (filter === 'last_6_months') {
    return diffDays <= 180;
  }

  if (filter === 'last_year') {
    return diffDays <= 365;
  }

  return true;
}

export const ResolvedIssuesView: React.FC<ResolvedIssuesViewProps> = ({
  issues,
  onOpenLightbox,
}) => {
  const [selectedIssue, setSelectedIssue] = useState<ResolvedIssue | null>(null);
  const [timeFilter, setTimeFilter] = useState<ResolvedTimeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Counts for filters
  const counts = useMemo(() => {
    return {
      all: issues.length,
      today: issues.filter((i) => matchesTimeFilter(i, 'today')).length,
      this_month: issues.filter((i) => matchesTimeFilter(i, 'this_month')).length,
      last_month: issues.filter((i) => matchesTimeFilter(i, 'last_month')).length,
      last_3_months: issues.filter((i) => matchesTimeFilter(i, 'last_3_months')).length,
      last_6_months: issues.filter((i) => matchesTimeFilter(i, 'last_6_months')).length,
      last_year: issues.filter((i) => matchesTimeFilter(i, 'last_year')).length,
    };
  }, [issues]);

  const filteredIssues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return issues.filter((issue) => {
      if (!matchesTimeFilter(issue, timeFilter)) return false;
      if (q) {
        const text = `${issue.representative_issue} ${issue.place} ${issue.resolved_by || ''} ${issue.resolution_note || ''} ${issue.first_raiser_name || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [issues, timeFilter, searchQuery]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Banner */}
      <div className="top-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="trophy-icon-box" style={{ background: 'var(--low-bg)', borderColor: 'var(--low)' }}>
            <ShieldCheck size={28} color="var(--low)" />
          </div>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
              ✅ Resolved Campus Grievances Archive
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              Completed grievances verified by club teams and facilities management. Resolved tickets are archived here and removed from the active dashboard. <strong>Click on any card</strong> to view original submitter details and resolution history.
            </p>
          </div>
        </div>
      </div>

      {/* ── FILTER TOOLBAR (Daily, Monthly, Last Month, 3M, 6M, 1Y, Total) ── */}
      <div className="resolved-filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginRight: 4 }}>
              <Filter size={13} /> Timeframe:
            </span>

            <button
              className={`filter-btn ${timeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setTimeFilter('all')}
            >
              All Time ({counts.all})
            </button>
            <button
              className={`filter-btn ${timeFilter === 'today' ? 'active' : ''}`}
              onClick={() => setTimeFilter('today')}
            >
              Today ({counts.today})
            </button>
            <button
              className={`filter-btn ${timeFilter === 'this_month' ? 'active' : ''}`}
              onClick={() => setTimeFilter('this_month')}
            >
              This Month ({counts.this_month})
            </button>
            <button
              className={`filter-btn ${timeFilter === 'last_month' ? 'active' : ''}`}
              onClick={() => setTimeFilter('last_month')}
            >
              Last Month ({counts.last_month})
            </button>
            <button
              className={`filter-btn ${timeFilter === 'last_3_months' ? 'active' : ''}`}
              onClick={() => setTimeFilter('last_3_months')}
            >
              Last 3 Months ({counts.last_3_months})
            </button>
            <button
              className={`filter-btn ${timeFilter === 'last_6_months' ? 'active' : ''}`}
              onClick={() => setTimeFilter('last_6_months')}
            >
              Last 6 Months ({counts.last_6_months})
            </button>
            <button
              className={`filter-btn ${timeFilter === 'last_year' ? 'active' : ''}`}
              onClick={() => setTimeFilter('last_year')}
            >
              Last 1 Year ({counts.last_year})
            </button>
          </div>

          {/* Search Box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 220, maxWidth: 320 }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search location, problem..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 30px',
                  borderRadius: 20,
                  fontSize: 12,
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status Count Indicator */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <span>Showing <strong>{filteredIssues.length}</strong> of <strong>{issues.length}</strong> resolved grievance(s)</span>
          {timeFilter !== 'all' && (
            <button
              onClick={() => setTimeFilter('all')}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
            >
              Reset to All Time
            </button>
          )}
        </div>
      </div>

      {/* List or Empty State */}
      {filteredIssues.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.7 }}>🔍</div>
          <h3 style={{ fontSize: 17, color: 'var(--text)', marginBottom: 6 }}>No Resolved Grievances Match This Filter</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {issues.length === 0
              ? 'When club members resolve complaints and submit proof, they will appear here.'
              : 'Try selecting a broader timeframe like "All Time" or clearing your search.'}
          </p>
          {issues.length > 0 && (
            <button
              className="btn"
              style={{ marginTop: 12, fontSize: 12 }}
              onClick={() => {
                setTimeFilter('all');
                setSearchQuery('');
              }}
            >
              Show All Resolved Tickets
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 20 }}>
          {filteredIssues.map((issue) => {
            const complaintImg = getImageUrl(issue.media_url);
            const proofImg = getImageUrl(issue.proof_media_url);
            const isVideoProof = Boolean(issue.proof_media_url && /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(issue.proof_media_url));
            const reporter = formatReporter(issue.first_raiser_name, issue.first_raiser_email);
            const raisedDate = issue.created_at
              ? new Date(issue.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Earlier';

            return (
              <div
                key={issue.id}
                className="resolved-card interactive-resolved-card"
                onClick={() => setSelectedIssue(issue)}
                title="Click to view first raiser details and full resolution record"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span className="resolved-badge">
                    <CheckCircle2 size={13} /> Resolved & Verified
                  </span>
                  {issue.ai_category && (
                    <span className="category-pill" style={{ padding: '2px 8px', fontSize: 11 }}>
                      {getCategoryIcon(issue.ai_category)} {issue.ai_category}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={13} /> {issue.place}
                </div>

                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginTop: 4, lineHeight: 1.4 }}>
                  {issue.representative_issue}
                </h3>

                {/* 👤 FIRST RAISER SPOTLIGHT (Always visible on card) */}
                <div className="first-raiser-spotlight-box">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      <Award size={13} /> First Raised By
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Click card for details ↗</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                    <div className="raiser-avatar-sm">{reporter.initials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {reporter.name}
                      </div>
                      {reporter.email && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          ✉ {reporter.email}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, marginTop: 2 }}>
                        📅 Raised on {raisedDate}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Evidence Thumbnail if exists */}
                {complaintImg && (
                  <div
                    style={{
                      height: 130,
                      borderRadius: 8,
                      overflow: 'hidden',
                      marginTop: 10,
                      position: 'relative',
                      cursor: 'pointer',
                      background: 'var(--surface2)',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenLightbox(complaintImg, `Original Grievance — ${issue.place}`);
                    }}
                  >
                    <img
                      src={complaintImg}
                      alt="Complaint Evidence"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>
                      Original Photo ↗
                    </div>
                  </div>
                )}

                {/* Resolution Summary Box */}
                <div className="resolution-details-box">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--low)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <UserCheck size={14} /> Resolution Details
                  </div>

                  <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 6, lineHeight: 1.4 }}>
                    <strong>Action Taken:</strong> {issue.resolution_note || 'Resolved by facilities maintenance team.'}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                    <span>Resolved by: <strong>{issue.resolved_by || 'Club Administrator'}</strong></span>
                    <span>
                      {issue.resolved_at
                        ? new Date(issue.resolved_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Completed'}
                    </span>
                  </div>

                  {proofImg && (
                    isVideoProof ? (
                      <a
                        href={proofImg}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-resolve"
                        style={{ marginTop: 8, width: '100%', fontSize: 11, padding: '6px', textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Video size={13} />
                        Watch Resolution Video Proof ↗
                      </a>
                    ) : (
                      <button
                        className="btn btn-resolve"
                        style={{ marginTop: 8, width: '100%', fontSize: 11, padding: '5px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenLightbox(proofImg, `Resolution Proof — ${issue.place}`);
                        }}
                      >
                        <ImageIcon size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} />
                        View Resolution Proof Photo ↗
                      </button>
                    )
                  )}
                </div>

                <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: 'var(--accent2)', fontWeight: 600 }}>
                  🔍 Click to view first raiser & full resolution summary
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal for Selected Resolved Issue (First Person Name, Email, Date) ── */}
      {selectedIssue && (
        <div className="modal-bg" onClick={() => setSelectedIssue(null)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 650, maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="modal-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="trophy-icon-box" style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--low-bg)', borderColor: 'var(--low)' }}>
                  <ShieldCheck size={20} color="var(--low)" />
                </span>
                <div>
                  <div className="modal-title" style={{ fontSize: 17 }}>
                    Resolved Grievance & First-Raiser Record
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Issue #{selectedIssue.id} · 📍 {selectedIssue.place}
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setSelectedIssue(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 16 }}>
              {/* Highlight Box: First Person Who Raised the Issue */}
              {(() => {
                const rep = formatReporter(selectedIssue.first_raiser_name, selectedIssue.first_raiser_email);
                const fullDate = selectedIssue.created_at
                  ? new Date(selectedIssue.created_at).toLocaleString(undefined, {
                      dateStyle: 'full',
                      timeStyle: 'short',
                    })
                  : 'Date not recorded';

                return (
                  <div
                    style={{
                      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.04) 100%)',
                      border: '2px solid var(--accent)',
                      borderRadius: 12,
                      padding: '16px 20px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                      <Award size={16} /> Original First Submitter (First-Raiser)
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12 }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          background: 'var(--surface)',
                          border: '2px solid var(--accent)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 18,
                          fontWeight: 800,
                          color: 'var(--accent)',
                          flexShrink: 0,
                        }}
                      >
                        {rep.initials}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
                          {rep.name}
                        </div>
                        {rep.email ? (
                          <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <Mail size={14} /> {rep.email}
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>
                            No email attached (Submitted anonymously)
                          </div>
                        )}

                        <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Calendar size={14} /> Originally Raised On: {fullDate}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Grievance Summary */}
              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent2)', textTransform: 'uppercase' }}>
                  📍 {selectedIssue.place}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>
                  {selectedIssue.representative_issue}
                </div>
                {selectedIssue.media_url && (
                  <div style={{ marginTop: 12 }}>
                    <button
                      className="btn"
                      style={{ fontSize: 12, padding: '6px 12px', background: 'var(--surface3)' }}
                      onClick={() => onOpenLightbox(getImageUrl(selectedIssue.media_url), `Evidence — ${selectedIssue.place}`)}
                    >
                      <ImageIcon size={13} style={{ marginRight: 6, verticalAlign: '-2px' }} /> View Original Evidence Photo ↗
                    </button>
                  </div>
                )}
              </div>

              {/* Resolution Details */}
              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--low)', textTransform: 'uppercase' }}>
                  <CheckCircle2 size={15} /> Resolution Summary
                </div>
                <div style={{ fontSize: 14, color: 'var(--text)', marginTop: 8, lineHeight: 1.5 }}>
                  {selectedIssue.resolution_note || 'Resolved by campus facilities team.'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                  <span>Resolved By: <strong>{selectedIssue.resolved_by || 'Club Administrator'}</strong></span>
                  <span>
                    {selectedIssue.resolved_at
                      ? new Date(selectedIssue.resolved_at).toLocaleDateString(undefined, { dateStyle: 'medium' })
                      : 'Completed'}
                  </span>
                </div>
                {selectedIssue.proof_media_url && (
                  <div style={{ marginTop: 12 }}>
                    {/\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(selectedIssue.proof_media_url) ? (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ai)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Video size={13} /> Resolution Proof Video
                        </div>
                        <video
                          src={getImageUrl(selectedIssue.proof_media_url)}
                          controls
                          style={{ width: '100%', maxHeight: 260, borderRadius: 8, background: '#000', display: 'block' }}
                        />
                      </div>
                    ) : (
                      <button
                        className="btn btn-resolve"
                        style={{ fontSize: 12, padding: '6px 12px' }}
                        onClick={() => onOpenLightbox(getImageUrl(selectedIssue.proof_media_url), `Proof — ${selectedIssue.place}`)}
                      >
                        <ImageIcon size={13} style={{ marginRight: 6, verticalAlign: '-2px' }} /> View Resolution Proof Photo ↗
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
