import { useState, useRef, useCallback } from 'react';
import { Check, CheckCheck, Pencil, Trash2, Reply } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import MediaViewer from './MediaViewer';

interface Message {
  id: string;
  sender: string;
  receiver: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  is_read: boolean;
  is_edited: boolean;
  created_at: string;
  reply_to: string | null;
  deleted_for: string[];
}

interface Props {
  message: Message;
  isSent: boolean;
  currentUser: string;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (message: Message) => void;
  replyMessage?: Message | null;
  selected?: boolean;
  selectionMode?: boolean;
  onSelect?: (id: string) => void;
  onLongPress?: (id: string) => void;
}

const MessageBubble = ({
  message, isSent, currentUser, onReply, onEdit, onDelete,
  replyMessage, selected, selectionMode, onSelect, onLongPress,
}: Props) => {
  const [mediaOpen, setMediaOpen] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const canEdit = isSent && differenceInMinutes(new Date(), new Date(message.created_at)) < 5;
  const isDeleted = message.deleted_for?.includes('all') || message.deleted_for?.includes(currentUser);
  const time = format(new Date(message.created_at), 'HH:mm');

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
    swiped.current = false;
    longPressTimer.current = setTimeout(() => {
      if (!swiped.current) onLongPress?.(message.id);
    }, 500);
  }, [message.id, onLongPress]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStart.current.x;
    const dy = touch.clientY - touchStart.current.y;
    if (Math.abs(dy) > 15) {
      clearTimeout(longPressTimer.current);
      touchStart.current = null;
      setSwipeX(0);
      return;
    }
    const swipeDir = isSent ? -1 : 1;
    const clampedDx = Math.max(0, dx * swipeDir);
    if (clampedDx > 10) {
      swiped.current = true;
      clearTimeout(longPressTimer.current);
      setSwipeX(Math.min(clampedDx, 80) * swipeDir);
    }
  }, [isSent]);

  const handleTouchEnd = useCallback(() => {
    clearTimeout(longPressTimer.current);
    if (Math.abs(swipeX) >= 60) onReply(message);
    setSwipeX(0);
    touchStart.current = null;
  }, [swipeX, message, onReply]);

  const handleClick = () => {
    if (selectionMode) onSelect?.(message.id);
  };

  if (isDeleted) {
    return (
      <div
        className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-1 px-3`}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={() => clearTimeout(longPressTimer.current)}
      >
        {selectionMode && (
          <div className="flex items-center mr-2">
            <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${selected ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
              {selected && <Check className="h-3 w-3 text-primary-foreground" />}
            </div>
          </div>
        )}
        <div className={`max-w-[75%] rounded-xl px-3 py-2 ${isSent ? 'bg-chat-sent rounded-tr-sm' : 'bg-chat-received rounded-tl-sm'}`}>
          <p className="text-sm italic text-muted-foreground">🚫 This message was deleted</p>
          <span className="text-[10px] text-chat-timestamp">{time}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        ref={bubbleRef}
        className={`group flex ${isSent ? 'justify-end' : 'justify-start'} mb-1 px-3 transition-transform`}
        style={{ transform: `translateX(${swipeX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        {swipeX !== 0 && (
          <div className={`absolute ${isSent ? 'right-0' : 'left-0'} top-1/2 -translate-y-1/2 px-2 text-primary`}>
            <Reply className="h-5 w-5" />
          </div>
        )}

        {selectionMode && (
          <div className="flex items-center mr-2">
            <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${selected ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
              {selected && <Check className="h-3 w-3 text-primary-foreground" />}
            </div>
          </div>
        )}

        <div className={`relative max-w-[75%] rounded-xl px-3 py-2 ${isSent ? 'bg-chat-sent rounded-tr-sm' : 'bg-chat-received rounded-tl-sm'} ${selected ? 'ring-2 ring-primary' : ''}`}>
          {replyMessage && (
            <div className="mb-1.5 rounded-md border-l-2 border-primary bg-background/20 px-2 py-1">
              <p className="text-[11px] font-medium text-primary capitalize">{replyMessage.sender}</p>
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                {replyMessage.content || (replyMessage.media_url ? '📎 Media' : '')}
              </p>
            </div>
          )}

          {message.media_url && (
            <div className="mb-1 overflow-hidden rounded-lg cursor-pointer" onClick={() => !selectionMode && setMediaOpen(true)}>
              {message.media_type === 'video' ? (
                <video src={message.media_url} className="max-h-60 w-full rounded-lg" />
              ) : (
                <img src={message.media_url} alt="" className="max-h-60 w-full rounded-lg object-cover" />
              )}
            </div>
          )}

          {message.content && <p className="text-sm text-foreground break-words">{message.content}</p>}

          <div className="mt-0.5 flex items-center justify-end gap-1">
            {message.is_edited && <span className="text-[10px] text-chat-timestamp">edited</span>}
            <span className="text-[10px] text-chat-timestamp">{time}</span>
            {isSent && (
              message.is_read ? <CheckCheck className="h-3.5 w-3.5 text-read-tick" /> : <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>

          {!selectionMode && (
            <div className="absolute -top-3 right-1 hidden gap-0.5 rounded-md bg-card/90 px-1 py-0.5 shadow group-hover:flex">
              <button onClick={() => onReply(message)} className="text-muted-foreground hover:text-foreground p-0.5" title="Reply"><Reply className="h-3.5 w-3.5" /></button>
              {canEdit && <button onClick={() => onEdit(message)} className="text-muted-foreground hover:text-foreground p-0.5" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>}
              <button onClick={() => onDelete(message)} className="text-muted-foreground hover:text-destructive p-0.5" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          )}
        </div>
      </div>

      {mediaOpen && message.media_url && (
        <MediaViewer url={message.media_url} type={message.media_type || 'image'} onClose={() => setMediaOpen(false)} />
      )}
    </>
  );
};

export default MessageBubble;
