import { memo, useCallback, Ref } from 'react';
import MessageBubble from './MessageBubble';

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
  messages: Message[];
  currentUser: string;
  otherTyping: boolean;
  messageMap: Map<string, Message>;
  selectedIds: Set<string>;
  selectionMode: boolean;
  bottomRef: Ref<HTMLDivElement>;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (message: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  onSelect: (id: string) => void;
  onLongPress: (id: string) => void;
}

const MessageList = memo(({
  messages,
  currentUser,
  otherTyping,
  messageMap,
  selectedIds,
  selectionMode,
  bottomRef,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onSelect,
  onLongPress,
}: Props) => {
  // Memoize callback to prevent unnecessary bubble re-renders
  const stableOnReply = useCallback(onReply, []);
  const stableOnEdit = useCallback(onEdit, []);
  const stableOnDelete = useCallback(onDelete, []);
  const stableOnReact = useCallback(onReact, []);
  const stableOnSelect = useCallback(onSelect, []);
  const stableOnLongPress = useCallback(onLongPress, []);

  return (
    <div className="flex-1 overflow-y-auto py-2 scrollbar-thin" style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
    }}>
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isSent={msg.sender === currentUser}
          currentUser={currentUser}
          onReply={stableOnReply}
          onEdit={stableOnEdit}
          onDelete={stableOnDelete}
          onReact={stableOnReact}
          replyMessage={msg.reply_to ? messageMap.get(msg.reply_to) : null}
          selected={selectedIds.has(msg.id)}
          selectionMode={selectionMode}
          onSelect={stableOnSelect}
          onLongPress={stableOnLongPress}
        />
      ))}
      {otherTyping && (
        <div className="flex justify-start mb-1 px-3">
          <div className="rounded-xl bg-chat-received rounded-tl-sm px-4 py-2.5">
            <div className="flex gap-1">
              <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}, (prevProps, nextProps) => {
  // Return true if props are equal (skip re-render), false if different (re-render)
  const isSame = (
    prevProps.messages === nextProps.messages &&
    prevProps.currentUser === nextProps.currentUser &&
    prevProps.otherTyping === nextProps.otherTyping &&
    prevProps.messageMap === nextProps.messageMap &&
    prevProps.selectedIds === nextProps.selectedIds &&
    prevProps.selectionMode === nextProps.selectionMode
  );
  return isSame;
});

MessageList.displayName = 'MessageList';

export default MessageList;
