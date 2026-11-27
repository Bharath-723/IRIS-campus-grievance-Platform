import React from 'react';
import { X } from 'lucide-react';

interface LightboxModalProps {
  imageUrl: string | null;
  caption: string;
  onClose: () => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({ imageUrl, caption, onClose }) => {
  if (!imageUrl) return null;

  return (
    <div className="lightbox" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose}>
        <X size={28} />
      </button>
      <img src={imageUrl} alt={caption} onClick={(e) => e.stopPropagation()} />
      <div className="lightbox-caption">{caption}</div>
    </div>
  );
};
