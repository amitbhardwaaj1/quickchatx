import { useState } from 'react';
import { Check, CheckCheck, Pencil, X, Trash2, Reply, CornerDownRight } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
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
  replyMessage?: Message | null;
}

const MessageBubble = ({ message, isSent, currentUser, onReply, replyMessage }: Props) => {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.content || '');
  const [deleteDialog, setDeleteDialog] = useState(false);

  const canEdit = isSent && differenceInMinutes(new Date(), new Date(message.created_at)) < 5;

  // Check if deleted
  if (message.deleted_for?.includes('all') || message.deleted_for?.includes(currentUser)) {
    return (
      <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-1 px-3`}>
        <div className={`max-w-[75%] rounded-xl px-3 py-2 ${isSent ? 'bg-chat-sent rounded-tr-sm' : 'bg-chat-received rounded-tl-sm'}`}>
          <p className="text-sm italic text-muted-foreground">🚫 This message was deleted</p>
          <span className="text-[10px] text-chat-timestamp">{format(new Date(message.created_at), 'HH:mm')}</span>
        </div>
      </div>
    );
  }

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    await supabase
      .from('messages')
      .update({ content: editText, is_edited: true, edited_at: new Date().toISOString() })
      .eq('id', message.id);
    setEditing(false);
  };

  const handleDeleteForMe = async () => {
    const updated = [...(message.deleted_for || []), currentUser];
    await supabase.from('messages').update({ deleted_for: updated }).eq('id', message.id);
    setDeleteDialog(false);
  };

  const handleDeleteForEveryone = async () => {
    await supabase.from('messages').update({ deleted_for: ['all'] }).eq('id', message.id);
    setDeleteDialog(false);
  };

  const time = format(new Date(message.created_at), 'HH:mm');

  return (
    <>
      <div className={`group flex animate-fade-in ${isSent ? 'justify-end' : 'justify-start'} mb-1 px-3`}>
        <div
          className={`relative max-w-[75%] rounded-xl px-3 py-2 ${
            isSent ? 'bg-chat-sent rounded-tr-sm' : 'bg-chat-received rounded-tl-sm'
          }`}
        >
          {/* Reply preview */}
          {replyMessage && (
            <div className="mb-1.5 rounded-md border-l-2 border-primary bg-background/20 px-2 py-1">
              <p className="text-[11px] font-medium text-primary capitalize">{replyMessage.sender}</p>
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                {replyMessage.content || (replyMessage.media_url ? '📎 Media' : '')}
              </p>
            </div>
          )}

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
          </div>

          {/* Action buttons - shown on hover */}
          <div className="absolute -top-3 right-1 hidden gap-0.5 rounded-md bg-card/90 px-1 py-0.5 shadow group-hover:flex">
            <button onClick={() => onReply(message)} className="text-muted-foreground hover:text-foreground p-0.5" title="Reply">
              <Reply className="h-3.5 w-3.5" />
            </button>
            {canEdit && !editing && (
              <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground p-0.5" title="Edit">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            <button onClick={() => setDeleteDialog(true)} className="text-muted-foreground hover:text-destructive p-0.5" title="Delete">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete dialog */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete message?</AlertDialogTitle>
            <AlertDialogDescription>Choose how you want to delete this message.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            {isSent && differenceInMinutes(new Date(), new Date(message.created_at)) < 60 && (
              <AlertDialogAction
                onClick={handleDeleteForEveryone}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full"
              >
                Delete for everyone
              </AlertDialogAction>
            )}
            <AlertDialogAction
              onClick={handleDeleteForMe}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80 w-full"
            >
              Delete for me
            </AlertDialogAction>
            <AlertDialogCancel className="w-full mt-0">Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MessageBubble;
