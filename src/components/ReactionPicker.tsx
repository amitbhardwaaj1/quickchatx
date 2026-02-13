import { useState } from 'react';

const QUICK_REACTIONS = ['❤️', '😂', '👍', '😮', '😢', '🙏'];

interface Props {
  onReact: (emoji: string) => void;
  onClose: () => void;
}

const ReactionPicker = ({ onReact, onClose }: Props) => {
  return (
    <div
      className="absolute -top-10 left-1/2 -translate-x-1/2 z-20 flex gap-1 rounded-full bg-card border border-border px-2 py-1 shadow-lg"
      onClick={(e) => e.stopPropagation()}
    >
      {QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => { onReact(emoji); onClose(); }}
          className="text-lg hover:scale-125 transition-transform p-0.5"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

export default ReactionPicker;
