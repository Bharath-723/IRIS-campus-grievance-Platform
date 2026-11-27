import React, { useState } from 'react';
import { Issue, IssueStatus } from '../types';
import { updateIssueStatus } from '../services/api';
import { X } from 'lucide-react';

interface StatusModalProps {
  issue: Issue | null;
  onClose: () => void;
  onUpdated: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({ issue, onClose, onUpdated }) => {
  const [status, setStatus] = useState<IssueStatus>(issue?.status || 'open');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  if (!issue) return null;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await updateIssueStatus(issue.id, status, note);
      onUpdated();
      onClose();
    } catch (e) {
      alert('Failed to update status: ' + e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">Update Status — #{issue.id}</div>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div>
            <label>Current Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as IssueStatus)}
              style={{ marginTop: 4 }}
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div>
            <label>Status Note</label>
            <textarea
              placeholder="Explain status update (optional)..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ marginTop: 4 }}
            />
          </div>

          <div className="modal-actions">
            <button className="btn" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Saving...' : 'Save Status'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
