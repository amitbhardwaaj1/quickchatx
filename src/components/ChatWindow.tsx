import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useChatContext } from '@/lib/chatContext';
import ChatHeader from './ChatHeader';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';

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

const ChatWindow = () => {
  const { currentUser, otherUser } = useChatContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch messages
  useEffect(() => {
    if (!currentUser || !otherUser) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender.eq.${currentUser},receiver.eq.${otherUser}),and(sender.eq.${otherUser},receiver.eq.${currentUser})`
        )
        .order('created_at', { ascending: true });

      if (data) setMessages(data as Message[]);
    };
    fetchMessages();
  }, [currentUser, otherUser]);

  // Realtime subscription
  useEffect(() => {
    if (!currentUser || !otherUser) return;

    const channel = supabase
      .channel('messages-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const msg = payload.new as Message;
        if (
          (msg.sender === currentUser && msg.receiver === otherUser) ||
          (msg.sender === otherUser && msg.receiver === currentUser)
        ) {
          setMessages(prev => [...prev, msg]);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const updated = payload.new as Message;
        setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, otherUser]);

  // Mark received messages as read
  useEffect(() => {
    if (!currentUser || !otherUser) return;

    const unread = messages.filter(m => m.sender === otherUser && !m.is_read);
    if (unread.length > 0) {
      supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', unread.map(m => m.id))
        .then();
    }
  }, [messages, currentUser, otherUser]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex h-screen flex-col bg-background">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto py-2 scrollbar-thin" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}>
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isSent={msg.sender === currentUser}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatWindow;
