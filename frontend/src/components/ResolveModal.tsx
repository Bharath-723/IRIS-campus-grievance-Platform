import React, { useState, useRef } from 'react';
import { Issue } from '../types';
import { submitResolutionProof, uploadResolutionProof } from '../services/api';
import { X, Upload, Image as ImageIcon, Video, CheckCircle2, Trash2, Paperclip, Link2 } from 'lucide-react';

interface ResolveModalProps {
  issue: Issue | null;
  onClose: () => void;
  onResolved: () => void;
}

export const ResolveModal: React.FC<ResolveModalProps> = ({ issue, onClose, onResolved }) => {
  const [resolvedBy, setResolvedBy] = useState('');
  const [note, setNote] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
    type: 'image' | 'video';
    previewUrl?: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showManualLink, setShowManualLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!issue) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(file.name);
    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.name);

    if (!isVideo && !isImage) {
      alert('Please upload an image or video file.');
      return;
    }

    setUploading(true);
    try {
      const res = await uploadResolutionProof(file);
      const previewUrl = URL.createObjectURL(file);
      setProofUrl(res.url);
      setUploadedFile({
        name: file.name,
        size: file.size,
        type: res.media_type,
        previewUrl,
      });
    } catch (err) {
      alert('Failed to upload proof file: ' + err);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    if (uploadedFile?.previewUrl) {
      URL.revokeObjectURL(uploadedFile.previewUrl);
    }
    setUploadedFile(null);
    setProofUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div className="modal-head">
          <div className="modal-title">Resolve Grievance — #{issue.id}</div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
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
              style={{ marginTop: 4, minHeight: 90 }}
            />
          </div>

          {/* 📎 FILE ATTACHMENT SECTION (Images & Videos) */}
          <div>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Proof Media (Photo or Video Proof)</span>
              <button
                type="button"
                onClick={() => setShowManualLink(!showManualLink)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent2)',
                  fontSize: 11,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <Link2 size={12} /> {showManualLink ? 'Hide manual link' : 'Or paste URL'}
              </button>
            </label>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,video/*"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />

            {!uploadedFile ? (
              <div
                className="dropzone-box"
                onClick={() => !uploading && fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) {
                    const fakeEvent = {
                      target: { files: e.dataTransfer.files },
                    } as unknown as React.ChangeEvent<HTMLInputElement>;
                    handleFileSelect(fakeEvent);
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--accent)' }}>
                  <Paperclip size={24} />
                  <ImageIcon size={22} color="var(--accent2)" />
                  <Video size={22} color="var(--ai)" />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 8 }}>
                  {uploading ? 'Uploading attachment...' : 'Attach Proof Image or Video'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Click to browse from device or drag & drop (JPG, PNG, WebP, MP4, WebM, MOV)
                </div>
                <button
                  type="button"
                  className="btn"
                  disabled={uploading}
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    padding: '6px 14px',
                    background: 'var(--surface3)',
                    border: '1px solid var(--border)',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  <Upload size={13} style={{ marginRight: 5, verticalAlign: '-1px' }} />
                  {uploading ? 'Uploading...' : 'Choose File from Device'}
                </button>
              </div>
            ) : (
              /* Uploaded Attachment Card */
              <div className="uploaded-proof-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                  {uploadedFile.type === 'video' ? (
                    <div className="proof-thumb-preview video-thumb">
                      <Video size={20} color="#fff" />
                    </div>
                  ) : (
                    <div className="proof-thumb-preview">
                      <img src={uploadedFile.previewUrl} alt="Preview" />
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {uploadedFile.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span>{formatFileSize(uploadedFile.size)}</span>
                      <span>·</span>
                      <span style={{ color: 'var(--low)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <CheckCircle2 size={12} /> Ready to save
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-remove-attachment"
                  title="Remove file"
                  onClick={handleRemoveFile}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}

            {/* Manual Link Fallback Input */}
            {showManualLink && (
              <div style={{ marginTop: 10 }}>
                <input
                  type="text"
                  placeholder="Or enter media link: https://..."
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  style={{ fontSize: 12 }}
                />
              </div>
            )}
          </div>

          <div className="modal-actions" style={{ marginTop: 18 }}>
            <button className="btn" onClick={onClose} disabled={loading || uploading}>
              Cancel
            </button>
            <button className="btn btn-resolve" onClick={handleSubmit} disabled={loading || uploading}>
              {loading ? 'Submitting...' : 'Confirm Resolved'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
