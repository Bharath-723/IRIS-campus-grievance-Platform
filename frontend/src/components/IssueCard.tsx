import React, { useState, useEffect } from 'react';
import { Issue } from '../types';
import { getImageUrl, requestAiRecommendation } from '../services/api';
import { MapPin, Clock, Calendar, Users, Sparkles } from 'lucide-react';

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

  // Case 1: Neither name nor real email provided -> "Anonymous Person"
  if (isAnonymousName && !realEmail) {
    return {
      initials: 'AP',
      name: 'Anonymous Person',
      email: null,
    };
  }

  // Case 2: Only email provided (no name) -> display email only
  if (isAnonymousName && realEmail) {
    return {
      initials: realEmail.slice(0, 2).toUpperCase(),
      name: realEmail,
      email: null,
    };
  }

  // Case 3: Name provided, email missing or fake -> display name only
  if (!isAnonymousName && !realEmail) {
    return {
      initials: getInitials(cleanName),
      name: cleanName,
      email: null,
    };
  }

  // Case 4: Both name and email provided -> display name and email
  return {
    initials: getInitials(cleanName),
    name: cleanName,
    email: realEmail,
  };
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
  const reporter = getReporterDisplay(issue.first_raiser_name, issue.first_raiser_email);

  const [currentSolution, setCurrentSolution] = useState(
    issue.ai_best_solution || issue.ai_suggested_solution || ''
  );
  const [currentReason, setCurrentReason] = useState(issue.ai_reason || '');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  useEffect(() => {
    setCurrentSolution(issue.ai_best_solution || issue.ai_suggested_solution || '');
    setCurrentReason(issue.ai_reason || '');
  }, [issue.ai_best_solution, issue.ai_suggested_solution, issue.ai_reason]);

  const handleRefreshAi = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsGeneratingAi(true);
    try {
      const res = await requestAiRecommendation(issue.id);
      setCurrentSolution(res.ai_suggested_solution);
      setCurrentReason(res.ai_reason);
    } catch (err) {
      alert('Could not refresh AI recommendation: ' + err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

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

        {/* 🤖 AI Recommended Solution Proposal */}
        <div className="ai-solution-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="ai-solution-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Sparkles size={13} color="var(--ai)" />
              <span>{issue.ai_best_solution ? '👑 Top Crowd Solution (AI Verified)' : '🤖 AI Recommended Solution'}</span>
            </div>
            <button
              className="btn-refresh-ai"
              onClick={handleRefreshAi}
              disabled={isGeneratingAi}
              title="Re-run AI solution engine for this issue"
            >
              {isGeneratingAi ? 'Thinking...' : '✨ Ask AI'}
            </button>
          </div>

          <div className="ai-solution-text" style={{ marginTop: 6, lineHeight: 1.45 }}>
            {currentSolution || 'Analyzing optimal campus resolution strategy...'}
          </div>

          {currentReason && <div className="ai-reason" style={{ marginTop: 4 }}>{currentReason}</div>}
        </div>

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
            <div className="avatar">{reporter.initials}</div>
            <div>
              <div className="reporter-name">{reporter.name}</div>
              {reporter.email && (
                <div className="reporter-email">{reporter.email}</div>
              )}
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
