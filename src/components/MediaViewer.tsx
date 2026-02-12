import { X } from 'lucide-react';

interface Props {
  url: string;
  type: string;
  onClose: () => void;
}

const MediaViewer = ({ url, type, onClose }: Props) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-50 rounded-full bg-muted/50 p-2 text-foreground hover:bg-muted"
      >
        <X className="h-6 w-6" />
      </button>

      <div className="max-h-[90vh] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
        {type === 'video' ? (
          <video src={url} controls autoPlay className="max-h-[90vh] max-w-[95vw] rounded-lg" />
        ) : (
          <img src={url} alt="" className="max-h-[90vh] max-w-[95vw] object-contain rounded-lg" />
        )}
      </div>
    </div>
  );
};

export default MediaViewer;
