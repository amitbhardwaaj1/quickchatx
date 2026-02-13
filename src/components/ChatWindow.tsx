import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useChatContext } from '@/lib/chatContext';
import ChatHeader from './ChatHeader';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import { Trash2, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { differenceInMinutes } from 'date-fns';

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
  reactions?: Record<string, string[]>;
}

interface Props {
  onBack: () => void;
}

const ChatWindow = ({ onBack }: Props) => {
  const { currentUser, otherUser } = useChatContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<{ id: string; content: string } | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [singleDeleteMsg, setSingleDeleteMsg] = useState<Message | null>(null);
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as Message;
        if (
          (msg.sender === currentUser && msg.receiver === otherUser) ||
          (msg.sender === otherUser && msg.receiver === currentUser)
        ) {
          setMessages(prev => [...prev, msg]);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        const updated = payload.new as Message;
        setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
        const deleted = payload.old as { id: string };
        setMessages(prev => prev.filter(m => m.id !== deleted.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser, otherUser]);

  // Typing indicator
  useEffect(() => {
    if (!currentUser || !otherUser) return;
    const channel = supabase.channel(`typing-${[currentUser, otherUser].sort().join('-')}`, {
      config: { presence: { key: currentUser } },
    });
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const otherState = state[otherUser] as any[];
        setOtherTyping(otherState?.some((s: any) => s.typing) || false);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser, otherUser]);

  const handleTyping = async (isTyping: boolean) => {
    const channelName = `typing-${[currentUser!, otherUser!].sort().join('-')}`;
    const channel = supabase.channel(channelName);
    await channel.track({ typing: isTyping });
  };

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

  const messageMap = useMemo(() => {
    const map = new Map<string, Message>();
    messages.forEach(m => map.set(m.id, m));
    return map;
  }, [messages]);

  // Selection handlers
  const handleLongPress = useCallback((id: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  }, []);

  const handleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  }, []);

  const exitSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  // Reactions
  const handleReact = useCallback(async (messageId: string, emoji: string) => {
    const msg = messageMap.get(messageId);
    if (!msg || !currentUser) return;
    const reactions = { ...(msg.reactions || {}) } as Record<string, string[]>;
    const users = reactions[emoji] || [];
    if (users.includes(currentUser)) {
      reactions[emoji] = users.filter(u => u !== currentUser);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...users, currentUser];
    }
    await supabase.from('messages').update({ reactions } as any).eq('id', messageId);
  }, [messageMap, currentUser]);

  // Single message delete
  const handleSingleDelete = (msg: Message) => setSingleDeleteMsg(msg);

  const handleDeleteForMe = async () => {
    if (singleDeleteMsg) {
      const updated = [...(singleDeleteMsg.deleted_for || []), currentUser!];
      await supabase.from('messages').update({ deleted_for: updated }).eq('id', singleDeleteMsg.id);
      setSingleDeleteMsg(null);
    }
  };

  const handleDeleteForEveryone = async () => {
    if (singleDeleteMsg) {
      await supabase.from('messages').update({ deleted_for: ['all'] }).eq('id', singleDeleteMsg.id);
      setSingleDeleteMsg(null);
    }
  };

  // Bulk delete
  const handleBulkDeleteForMe = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      const msg = messageMap.get(id);
      if (msg) {
        const updated = [...(msg.deleted_for || []), currentUser!];
        await supabase.from('messages').update({ deleted_for: updated }).eq('id', id);
      }
    }
    exitSelection();
    setDeleteDialog(false);
  };

  const handleBulkDeleteForEveryone = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await supabase.from('messages').update({ deleted_for: ['all'] }).eq('id', id);
    }
    exitSelection();
    setDeleteDialog(false);
  };

  const handleBulkPermanentDelete = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await supabase.from('messages').delete().eq('id', id);
    }
    exitSelection();
    setDeleteDialog(false);
  };

  const handleEdit = (msg: Message) => {
    setEditingMessage({ id: msg.id, content: msg.content || '' });
  };

  const canDeleteForEveryone = useMemo(() => {
    return Array.from(selectedIds).every(id => {
      const msg = messageMap.get(id);
      return msg && msg.sender === currentUser && differenceInMinutes(new Date(), new Date(msg.created_at)) < 60;
    });
  }, [selectedIds, messageMap, currentUser]);

  const hasDeletedMessages = useMemo(() => {
    return Array.from(selectedIds).some(id => {
      const msg = messageMap.get(id);
      return msg && (msg.deleted_for?.includes('all') || msg.deleted_for?.includes(currentUser!));
    });
  }, [selectedIds, messageMap, currentUser]);

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {selectionMode ? (
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={exitSelection} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
            <span className="font-semibold text-foreground">{selectedIds.size} selected</span>
          </div>
          <button onClick={() => setDeleteDialog(true)} className="rounded-lg p-2 text-destructive hover:bg-destructive/10">
            <Trash2 className="h-5 w-5" />
          </button>
        </header>
      ) : (
        <ChatHeader onBack={onBack} />
      )}

      <div className="flex-1 overflow-y-auto py-2 scrollbar-thin" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}>
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isSent={msg.sender === currentUser}
            currentUser={currentUser!}
            onReply={setReplyTo}
            onEdit={handleEdit}
            onDelete={handleSingleDelete}
            onReact={handleReact}
            replyMessage={msg.reply_to ? messageMap.get(msg.reply_to) : null}
            selected={selectedIds.has(msg.id)}
            selectionMode={selectionMode}
            onSelect={handleSelect}
            onLongPress={handleLongPress}
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

      <MessageInput
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onTyping={handleTyping}
        editingMessage={editingMessage}
        onCancelEdit={() => setEditingMessage(null)}
      />

      {/* Single message delete dialog */}
      <AlertDialog open={!!singleDeleteMsg} onOpenChange={() => setSingleDeleteMsg(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete message?</AlertDialogTitle>
            <AlertDialogDescription>Choose how you want to delete this message.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            {singleDeleteMsg && singleDeleteMsg.sender === currentUser && differenceInMinutes(new Date(), new Date(singleDeleteMsg.created_at)) < 60 && (
              <AlertDialogAction onClick={handleDeleteForEveryone} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full">
                Delete for everyone
              </AlertDialogAction>
            )}
            <AlertDialogAction onClick={handleDeleteForMe} className="bg-secondary text-secondary-foreground hover:bg-secondary/80 w-full">
              Delete for me
            </AlertDialogAction>
            <AlertDialogCancel className="w-full mt-0">Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete dialog */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete {selectedIds.size} message{selectedIds.size > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>Choose how you want to delete.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            {canDeleteForEveryone && (
              <AlertDialogAction onClick={handleBulkDeleteForEveryone} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full">
                Delete for everyone
              </AlertDialogAction>
            )}
            <AlertDialogAction onClick={handleBulkDeleteForMe} className="bg-secondary text-secondary-foreground hover:bg-secondary/80 w-full">
              Delete for me
            </AlertDialogAction>
            {hasDeletedMessages && (
              <AlertDialogAction onClick={handleBulkPermanentDelete} className="bg-destructive/80 text-destructive-foreground hover:bg-destructive w-full">
                Delete permanently (clear space)
              </AlertDialogAction>
            )}
            <AlertDialogCancel className="w-full mt-0">Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ChatWindow;
