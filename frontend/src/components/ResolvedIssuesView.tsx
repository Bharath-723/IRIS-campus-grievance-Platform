import React, { useState } from 'react';
import { ResolvedIssue } from '../types';
import { getImageUrl } from '../services/api';
import { CheckCircle2, MapPin, Calendar, UserCheck, ShieldCheck, Image as ImageIcon, User, Mail, Clock, X, ExternalLink, Award } from 'lucide-react';

interface ResolvedIssuesViewProps {
  issues: ResolvedIssue[];
  onOpenLightbox: (imageUrl: string, title: string) => void;
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

export const ResolvedIssuesView: React.FC<ResolvedIssuesViewProps> = ({
  issues,
  onOpenLightbox,
}) => {
  const [selectedIssue, setSelectedIssue] = useState<ResolvedIssue | null>(null);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Banner */}
      <div className="top-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="trophy-icon-box" style={{ background: 'var(--low-bg)', borderColor: 'var(--low)' }}>
            <ShieldCheck size={28} color="var(--low)" />
          </div>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
              ✅ Resolved Campus Grievances
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              Completed grievances resolved and verified by club teams and facilities management. <strong>Click on any resolved card</strong> to inspect the first student who raised the issue, their email, submission date, and complete resolution history.
            </p>
          </div>
        </div>
      </div>

      {/* List or Empty State */}
      {issues.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 44, marginBottom: 12, opacity: 0.7 }}>🎉</div>
          <h3 style={{ fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>No Resolved Tickets Yet</h3>
          <p>
            When club members resolve complaints and submit proof from the main dashboard, they will automatically appear here!
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 20 }}>
          {issues.map((issue) => {
            const complaintImg = getImageUrl(issue.media_url);
            const proofImg = getImageUrl(issue.proof_media_url);
            const reporter = formatReporter(issue.first_raiser_name, issue.first_raiser_email);
            const raisedDate = issue.created_at
              ? new Date(issue.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Unknown date';

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
                    <button
                      className="btn btn-resolve"
                      style={{ fontSize: 12, padding: '6px 12px' }}
                      onClick={() => onOpenLightbox(getImageUrl(selectedIssue.proof_media_url), `Proof — ${selectedIssue.place}`)}
                    >
                      <ImageIcon size={13} style={{ marginRight: 6, verticalAlign: '-2px' }} /> View Resolution Proof Photo ↗
                    </button>
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
