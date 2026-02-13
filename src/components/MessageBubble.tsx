import { useState, useRef, useCallback } from 'react';
import { Check, CheckCheck, Pencil, Trash2, Reply } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import MediaViewer from './MediaViewer';
import LinkifiedText from './LinkifiedText';
import ReactionPicker from './ReactionPicker';

interface Message {
  id: string;
  sender: string;
  receiver: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  is_read: boolean;
  is_edited: boolean;
  read_at?: string | null;
  created_at: string;
  reply_to: string | null;
  deleted_for: string[];
  reactions?: Record<string, string[]>;
}

interface Props {
  message: Message;
  isSent: boolean;
  currentUser: string;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (message: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  replyMessage?: Message | null;
  selected?: boolean;
  selectionMode?: boolean;
  onSelect?: (id: string) => void;
  onLongPress?: (id: string) => void;
}

const MessageBubble = ({
  message, isSent, currentUser, onReply, onEdit, onDelete, onReact,
  replyMessage, selected, selectionMode, onSelect, onLongPress,
}: Props) => {
  const [mediaOpen, setMediaOpen] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [showReactions, setShowReactions] = useState(false);
  const [reactionPos, setReactionPos] = useState<{ top: number; left: number } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const canEdit = isSent && differenceInMinutes(new Date(), new Date(message.created_at)) < 5;
  const isDeleted = message.deleted_for?.includes('all') || message.deleted_for?.includes(currentUser);
  const time = format(new Date(message.created_at), 'HH:mm');

  const reactions = (message.reactions || {}) as Record<string, string[]>;
  const reactionEntries = Object.entries(reactions).filter(([, users]) => users.length > 0);

  // Touch handlers - swipe to reply (lowered threshold for WhatsApp-like feel)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
    swiped.current = false;
    longPressTimer.current = setTimeout(() => {
      if (!swiped.current && !selectionMode) {
        // Long-press enters selection mode (like WhatsApp)
        onLongPress?.(message.id);
        // Haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(100);
        }
      }
    }, 500);
  }, [message.id, onLongPress, selectionMode]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStart.current.x;
    const dy = touch.clientY - touchStart.current.y;
    if (Math.abs(dy) > 20) {
      clearTimeout(longPressTimer.current);
      touchStart.current = null;
      setSwipeX(0);
      return;
    }
    // Prevent swipe reply for own messages (sender cannot swipe their own message to reply)
    // Received messages swipe right to reply, sent messages don't swipe for reply
    if (isSent) {
      return;
    }
    const swipeDir = 1; // Only received messages swipe right to reply
    const rawDx = dx * swipeDir;
    if (rawDx > 5) {
      swiped.current = true;
      clearTimeout(longPressTimer.current);
      setSwipeX(Math.min(rawDx, 80) * swipeDir);
    }
  }, [isSent]);

  const handleTouchEnd = useCallback(() => {
    clearTimeout(longPressTimer.current);
    if (Math.abs(swipeX) >= 30) onReply(message);
    setSwipeX(0);
    touchStart.current = null;
  }, [swipeX, message, onReply]);

  const handleClick = () => {
    if (selectionMode) {
      onSelect?.(message.id);
    } else if (showReactions) {
      setShowReactions(false);
    }
  };

  const handleDoubleClick = () => {
    if (!selectionMode && !isDeleted) {
      // Quick like (toggle heart) on double-click/double-tap like WhatsApp
      onReact(message.id, '❤️');
    }
  };

  const handleReactionSelect = (emoji: string) => {
    onReact(message.id, emoji);
    setShowReactions(false);
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
        style={{ transform: `translateX(${swipeX}px)`, transition: swipeX === 0 ? 'transform 0.2s' : 'none' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowReactions(true);
          if (bubbleRef.current) {
            const rect = bubbleRef.current.getBoundingClientRect();
            setReactionPos({ top: rect.top - 60, left: rect.left + rect.width / 2 - 150 });
          }
        }}
      >
        {swipeX !== 0 && !isSent && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 px-2 text-primary">
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

          {message.content && (
            <p className="text-sm text-foreground break-words select-text cursor-text">
              <LinkifiedText text={message.content} />
            </p>
          )}

          {/* Reactions display - WhatsApp style */}
          {reactionEntries.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {reactionEntries.map(([emoji, users]) => (
                <div
                  key={emoji}
                  className="flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs bg-muted/40 border border-muted"
                  title={users.join(', ')}
                >
                  <span className="text-sm">{emoji}</span>
                  {users.length > 1 && <span className="text-[10px] font-medium">{users.length}</span>}
                </div>
              ))}
            </div>
          )}

          <div className="mt-0.5 flex items-center justify-end gap-1">
            {message.is_edited && <span className="text-[10px] text-chat-timestamp">edited</span>}
            <span className="text-[10px] text-chat-timestamp">{time}</span>
                    {isSent && (
                      message.is_read ? (
                        message.read_at ? (
                          <span className="text-[10px] text-muted-foreground">Seen {format(new Date(message.read_at), 'HH:mm')}</span>
                        ) : (
                          <CheckCheck className="h-3.5 w-3.5 text-read-tick" />
                        )
                      ) : (
                        <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />
                      )
                    )}
          </div>

          {!selectionMode && (
            <div className="absolute -top-3 right-1 hidden gap-0.5 rounded-md bg-card/90 px-1 py-0.5 shadow group-hover:flex">
              <button onClick={() => onReply(message)} className="text-muted-foreground hover:text-foreground p-0.5" title="Reply"><Reply className="h-3.5 w-3.5" /></button>
              <button onClick={() => {
                setShowReactions(true);
                if (bubbleRef.current) {
                  const rect = bubbleRef.current.getBoundingClientRect();
                  setReactionPos({ top: rect.top - 60, left: rect.left + rect.width / 2 - 150 });
                }
              }} className="text-muted-foreground hover:text-foreground p-0.5" title="React">😊</button>
              {canEdit && <button onClick={() => onEdit(message)} className="text-muted-foreground hover:text-foreground p-0.5" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>}
              <button onClick={() => onDelete(message)} className="text-muted-foreground hover:text-destructive p-0.5" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          )}
        </div>
      </div>

      {mediaOpen && message.media_url && (
        <MediaViewer url={message.media_url} type={message.media_type || 'image'} onClose={() => setMediaOpen(false)} />
      )}

      {showReactions && reactionPos && (
        <ReactionPicker
          position={reactionPos}
          onReact={handleReactionSelect}
          onClose={() => setShowReactions(false)}
        />
      )}
    </>
  );
};

export default MessageBubble;
