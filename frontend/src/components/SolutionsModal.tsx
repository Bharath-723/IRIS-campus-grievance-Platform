import React, { useEffect, useState } from 'react';
import { Issue, Solution } from '../types';
import { fetchSolutions, markSolutionUnique } from '../services/api';
import { X, Award, CheckCircle } from 'lucide-react';

interface SolutionsModalProps {
  issue: Issue | null;
  onClose: () => void;
}

export const SolutionsModal: React.FC<SolutionsModalProps> = ({ issue, onClose }) => {
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

  const handleMarkUnique = async (id: number) => {
    try {
      await markSolutionUnique(id);
      setSolutions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_unique: true } : s))
      );
    } catch (e) {
      alert('Failed to mark unique: ' + e);
    }
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">Solutions — {issue.place}</div>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            <strong>Issue:</strong> {issue.representative_issue}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>Loading solutions...</div>
          ) : solutions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
              No solutions submitted yet for this issue.
            </div>
          ) : (
            solutions.map((sol) => (
              <div
                key={sol.id}
                style={{
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 12 }}>
                    {sol.submitter_name || 'Anonymous Student'}
                  </span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {sol.ai_selected && (
                      <span
                        style={{
                          background: 'var(--ai-bg)',
                          color: 'var(--ai)',
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                        }}
                      >
                        🤖 AI Choice
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
                        ★ Unique
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: 13, lineHeight: 1.4 }}>{sol.solution_text}</div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 4,
                    fontSize: 11,
                    color: 'var(--text-muted)',
                  }}
                >
                  <span>{sol.submitter_email}</span>
                  {!sol.is_unique && (
                    <button
                      className="btn"
                      style={{ padding: '3px 8px', fontSize: 11 }}
                      onClick={() => handleMarkUnique(sol.id)}
                    >
                      Mark Unique
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
