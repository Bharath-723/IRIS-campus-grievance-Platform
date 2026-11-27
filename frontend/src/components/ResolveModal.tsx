import React, { useState } from 'react';
import { Issue } from '../types';
import { submitResolutionProof } from '../services/api';
import { X } from 'lucide-react';

interface ResolveModalProps {
  issue: Issue | null;
  onClose: () => void;
  onResolved: () => void;
}

export const ResolveModal: React.FC<ResolveModalProps> = ({ issue, onClose, onResolved }) => {
  const [resolvedBy, setResolvedBy] = useState('');
  const [note, setNote] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [loading, setLoading] = useState(false);

  if (!issue) return null;

  const handleSubmit = async () => {
    if (!resolvedBy.trim() || !note.trim()) {
      alert('Please provide resolver name and resolution summary.');
      return;
    }
    setLoading(true);
    try {
      await submitResolutionProof(issue.id, resolvedBy, note, proofUrl);
      onResolved();
      onClose();
    } catch (e) {
      alert('Failed to resolve issue: ' + e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">Resolve Grievance — #{issue.id}</div>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div>
            <label>Resolved By</label>
            <input
              type="text"
              placeholder="Your name / Club member"
              value={resolvedBy}
              onChange={(e) => setResolvedBy(e.target.value)}
              style={{ marginTop: 4 }}
            />
          </div>

          <div>
            <label>Resolution Summary</label>
            <textarea
              placeholder="Explain how the grievance was fixed..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ marginTop: 4 }}
            />
          </div>

          <div>
            <label>Proof Media Link (Optional)</label>
            <input
              type="text"
              placeholder="https://drive.google.com/file/d/..."
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              style={{ marginTop: 4 }}
            />
          </div>

          <div className="modal-actions">
            <button className="btn" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-resolve" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Submitting...' : 'Confirm Resolved'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
