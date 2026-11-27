import React from 'react';
import { Issue } from '../types';
import { getImageUrl } from '../services/api';
import { MapPin, Clock, Calendar, Users } from 'lucide-react';

interface IssueCardProps {
  issue: Issue;
  onOpenSolutions: (issue: Issue) => void;
  onOpenResolve: (issue: Issue) => void;
  onOpenStatus: (issue: Issue) => void;
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
  if (!name) return 'AS';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const IssueCard: React.FC<IssueCardProps> = ({
  issue,
  onOpenSolutions,
  onOpenResolve,
  onOpenStatus,
  onOpenLightbox,
}) => {
  const sevKey = (issue.severity_level || 'low').toLowerCase();
  const statusKey = (issue.status || 'open').toLowerCase().replace(' ', '_');
  const imageUrl = getImageUrl(issue.media_url);

  return (
    <div className="card">
      <div className="card-media">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Evidence Photo"
            loading="lazy"
            onClick={() => onOpenLightbox(imageUrl, issue.place || 'Evidence Photo')}
            onError={(e) => {
              const target = e.currentTarget;
              target.onerror = null;
              target.src = '/api/image/placeholder';
            }}
          />
        ) : (
          <div className="no-media">
            <div className="no-media-icon">◻</div>
            <span>No media attached</span>
          </div>
        )}

        {issue.ai_category && (
          <div className="ai-category-badge">
            {getCategoryIcon(issue.ai_category)} {issue.ai_category}
          </div>
        )}
      </div>

      <div className="card-body">
        <div className="card-top">
          <span className={`severity-badge sev-${sevKey}`}>
            {issue.severity_level || 'Normal'}
          </span>
          <div className="status-dot">
            <div className={`dot dot-${statusKey}`} />
            {statusKey.replace('_', ' ')}
          </div>
        </div>

        <div className="card-place">
          <MapPin size={13} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 3 }} />
          {issue.place || 'Campus'}
        </div>

        <div className="card-issue">
          {issue.representative_issue || 'No description provided'}
        </div>

        {issue.ai_best_solution && (
          <div className="ai-solution-box">
            <div className="ai-solution-label">🤖 AI Recommended Solution</div>
            <div className="ai-solution-text">{issue.ai_best_solution}</div>
            {issue.ai_reason && <div className="ai-reason">{issue.ai_reason}</div>}
          </div>
        )}

        <div className="card-meta">
          <div className="meta-item">
            <Clock size={12} /> {issue.issue_duration || 'Present'}
          </div>
          <div className="meta-item">
            <Calendar size={12} /> {issue.days_open || 0} days open
          </div>
          <div className="meta-item">
            <Users size={12} /> {issue.frequency || 1} report(s)
          </div>
        </div>

        <div className="card-footer">
          <div className="reporter">
            <div className="avatar">{getInitials(issue.first_raiser_name)}</div>
            <div>
              <div className="reporter-name">{issue.first_raiser_name || 'Anonymous'}</div>
              <div className="reporter-email">{issue.first_raiser_email || ''}</div>
            </div>
          </div>
          <div className="freq-badge">{issue.frequency || 1}× reported</div>
        </div>
      </div>

      <div className="card-actions">
        <button className="btn" onClick={() => onOpenSolutions(issue)}>
          Solutions ({issue.total_solutions || 0})
        </button>
        <button className="btn btn-resolve" onClick={() => onOpenResolve(issue)}>
          ✓ Resolve
        </button>
        <button className="btn btn-primary" onClick={() => onOpenStatus(issue)}>
          Status
        </button>
      </div>
    </div>
  );
};
