import { useEffect, useRef } from 'react';

const QUICK_REACTIONS = ['❤️', '😂', '👍', '😮', '😢', '🙏'];

interface Props {
  onReact: (emoji: string) => void;
  onClose: () => void;
  position?: { top: number; left: number };
}

const ReactionPicker = ({ onReact, onClose, position }: Props) => {
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [onClose]);

  return (
    <div
      ref={pickerRef}
      className="fixed z-50 flex gap-2 rounded-full bg-card border border-border px-3 py-2 shadow-xl animate-pop"
      style={position ? { top: `${position.top}px`, left: `${position.left}px`, transformOrigin: 'center' } : undefined}
      onClick={(e) => e.stopPropagation()}
    >
      {QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => { onReact(emoji); }}
          className="text-2xl hover:scale-125 transition-all active:scale-110 p-1 rounded hover:bg-muted"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

export default ReactionPicker;
