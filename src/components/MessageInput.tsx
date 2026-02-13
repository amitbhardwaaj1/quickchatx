import { useState, useRef, useEffect } from 'react';
import { Send, Image, X, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useChatContext } from '@/lib/chatContext';

interface ReplyTo {
  id: string;
  sender: string;
  content: string | null;
  media_url: string | null;
}

interface EditingMessage {
  id: string;
  content: string;
}

interface Props {
  replyTo?: ReplyTo | null;
  onCancelReply?: () => void;
  onTyping?: (isTyping: boolean) => void;
  editingMessage?: EditingMessage | null;
  onCancelEdit?: () => void;
}

const MessageInput = ({ replyTo, onCancelReply, onTyping, editingMessage, onCancelEdit }: Props) => {
  const { currentUser, otherUser } = useChatContext();
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();

  // When editing message changes, populate text
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content);
      inputRef.current?.focus();
    }
  }, [editingMessage]);

  const handleTextChange = (value: string) => {
    setText(value);
    onTyping?.(value.length > 0);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => onTyping?.(false), 2000);
  };

  useEffect(() => {
    return () => clearTimeout(typingTimeout.current);
  }, []);

  const sendMessage = async (content?: string, mediaUrl?: string, mediaType?: string) => {
    if (!currentUser || !otherUser) return;
    if (!content?.trim() && !mediaUrl) return;

    await supabase.from('messages').insert({
      sender: currentUser,
      receiver: otherUser,
      content: content?.trim() || null,
      media_url: mediaUrl || null,
      media_type: mediaType || null,
      reply_to: replyTo?.id || null,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !text.trim()) return;
    await supabase
      .from('messages')
      .update({ content: text.trim(), is_edited: true, edited_at: new Date().toISOString() })
      .eq('id', editingMessage.id);
    setText('');
    onCancelEdit?.();
    // Keep focus on input
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleSend = async () => {
    if (sending) return;

    if (editingMessage) {
      await handleSaveEdit();
      return;
    }

    if (!text.trim()) return;
    setSending(true);
    try {
      await sendMessage(text);
      // Play send notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.frequency.setValueAtTime(800, audioContext.currentTime);
      osc.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain.gain.setValueAtTime(0, audioContext.currentTime + 0.1);
      osc.start(audioContext.currentTime);
      osc.stop(audioContext.currentTime + 0.1);
      
      setText('');
      onCancelReply?.();
      onTyping?.(false);
      // Refocus after message sends (user expects keyboard to stay)
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const ext = file.name.split('.').pop();
    const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from('chat-media').upload(filePath, file);

    if (!error) {
      const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(filePath);
      const mediaType = file.type.startsWith('video') ? 'video' : 'image';
      await sendMessage(undefined, urlData.publicUrl, mediaType);
      onCancelReply?.();
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCancel = () => {
    if (editingMessage) {
      setText('');
      onCancelEdit?.();
    } else if (replyTo) {
      onCancelReply?.();
    }
  };

  return (
    <div className="border-t border-border bg-card px-3 py-2" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
      {(replyTo || editingMessage) && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
          <div className="flex-1 border-l-2 border-primary pl-2">
            <p className="text-xs font-medium text-primary">
              {editingMessage ? 'Editing message' : `Replying to ${replyTo?.sender}`}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {editingMessage
                ? editingMessage.content
                : replyTo?.content || (replyTo?.media_url ? '📎 Media' : '')}
            </p>
          </div>
          <button onClick={handleCancel} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*,video/*"
          className="hidden"
        />

        {!editingMessage && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Send photo or video"
          >
            <Image className="h-5 w-5" />
          </button>
        )}

        <textarea
          ref={inputRef}
          rows={1}
          inputMode="text"
          enterKeyHint="send"
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={editingMessage ? 'Edit message...' : 'Type a message...'}
          className="flex-1 resize-none rounded-full bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          autoComplete="off"
          autoFocus
        />

        <button
          onClick={handleSend}
          disabled={(!text.trim() && !uploading) || sending}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
        >
          {uploading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
          ) : editingMessage ? (
            <Check className="h-4 w-4" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
