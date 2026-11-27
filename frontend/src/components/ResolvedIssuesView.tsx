import React from 'react';
import { ResolvedIssue } from '../types';
import { getImageUrl } from '../services/api';
import { CheckCircle2, MapPin, Calendar, UserCheck, ShieldCheck, Image as ImageIcon } from 'lucide-react';

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

export const ResolvedIssuesView: React.FC<ResolvedIssuesViewProps> = ({
  issues,
  onOpenLightbox,
}) => {
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
              Completed grievances resolved and verified by club teams and facilities management. Resolved tickets are automatically moved here from the main active complaints grid.
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

            return (
              <div key={issue.id} className="resolved-card">
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

                {/* Evidence Thumbnail if exists */}
                {complaintImg && (
                  <div
                    style={{
                      height: 140,
                      borderRadius: 8,
                      overflow: 'hidden',
                      marginTop: 10,
                      position: 'relative',
                      cursor: 'pointer',
                      background: 'var(--surface2)',
                    }}
                    onClick={() => onOpenLightbox(complaintImg, `Original Grievance — ${issue.place}`)}
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
                      onClick={() => onOpenLightbox(proofImg, `Resolution Proof — ${issue.place}`)}
                    >
                      <ImageIcon size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} />
                      View Resolution Proof Photo ↗
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
