import { useState } from 'react';
import { Check, CheckCheck, Pencil, X } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

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
}

interface Props {
  message: Message;
  isSent: boolean;
}

const MessageBubble = ({ message, isSent }: Props) => {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.content || '');

  const canEdit = isSent && differenceInMinutes(new Date(), new Date(message.created_at)) < 5;

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    await supabase
      .from('messages')
      .update({ content: editText, is_edited: true, edited_at: new Date().toISOString() })
      .eq('id', message.id);
    setEditing(false);
  };

  const time = format(new Date(message.created_at), 'HH:mm');

  return (
    <div className={`flex animate-fade-in ${isSent ? 'justify-end' : 'justify-start'} mb-1 px-3`}>
      <div
        className={`relative max-w-[75%] rounded-xl px-3 py-2 ${
          isSent ? 'bg-chat-sent rounded-tr-sm' : 'bg-chat-received rounded-tl-sm'
        }`}
      >
        {/* Media */}
        {message.media_url && (
          <div className="mb-1 overflow-hidden rounded-lg">
            {message.media_type === 'video' ? (
              <video src={message.media_url} controls className="max-h-60 w-full rounded-lg" />
            ) : (
              <img src={message.media_url} alt="" className="max-h-60 w-full rounded-lg object-cover" />
            )}
          </div>
        )}

        {/* Content */}
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="flex-1 rounded bg-background px-2 py-1 text-sm text-foreground outline-none"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
            />
            <button onClick={handleSaveEdit} className="text-primary"><Check className="h-4 w-4" /></button>
            <button onClick={() => setEditing(false)} className="text-muted-foreground"><X className="h-4 w-4" /></button>
          </div>
        ) : (
          message.content && <p className="text-sm text-foreground break-words">{message.content}</p>
        )}

        {/* Footer */}
        <div className="mt-0.5 flex items-center justify-end gap-1">
          {message.is_edited && (
            <span className="text-[10px] text-chat-timestamp">edited</span>
          )}
          <span className="text-[10px] text-chat-timestamp">{time}</span>
          {isSent && (
            message.is_read ? (
              <CheckCheck className="h-3.5 w-3.5 text-read-tick" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />
            )
          )}
          {canEdit && !editing && (
            <button onClick={() => setEditing(true)} className="ml-1 text-muted-foreground hover:text-foreground">
              <Pencil className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
