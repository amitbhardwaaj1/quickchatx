import { useState, useRef } from 'react';
import { Send, Image, Video } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useChatContext } from '@/lib/chatContext';

const MessageInput = () => {
  const { currentUser, otherUser } = useChatContext();
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sendMessage = async (content?: string, mediaUrl?: string, mediaType?: string) => {
    if (!currentUser || !otherUser) return;
    if (!content?.trim() && !mediaUrl) return;

    await supabase.from('messages').insert({
      sender: currentUser,
      receiver: otherUser,
      content: content?.trim() || null,
      media_url: mediaUrl || null,
      media_type: mediaType || null,
    });
  };

  const handleSend = async () => {
    if (!text.trim()) return;
    await sendMessage(text);
    setText('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const ext = file.name.split('.').pop();
    const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from('chat-media')
      .upload(filePath, file);

    if (!error) {
      const { data: urlData } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath);

      const mediaType = file.type.startsWith('video') ? 'video' : 'image';
      await sendMessage(undefined, urlData.publicUrl, mediaType);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="border-t border-border bg-card px-3 py-3">
      <div className="flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*,video/*"
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Send photo or video"
        >
          <Image className="h-5 w-5" />
        </button>

        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Type a message..."
          className="flex-1 rounded-full bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />

        <button
          onClick={handleSend}
          disabled={!text.trim() && !uploading}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
        >
          {uploading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
