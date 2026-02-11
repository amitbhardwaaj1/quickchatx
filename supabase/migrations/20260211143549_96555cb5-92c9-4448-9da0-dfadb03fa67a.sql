
-- Add reply_to column to reference the message being replied to
ALTER TABLE public.messages ADD COLUMN reply_to uuid REFERENCES public.messages(id) ON DELETE SET NULL;

-- Add deleted_for column to track who deleted the message (null = not deleted, 'all' = deleted for everyone, username = deleted for that user only)
ALTER TABLE public.messages ADD COLUMN deleted_for text[] DEFAULT '{}';
