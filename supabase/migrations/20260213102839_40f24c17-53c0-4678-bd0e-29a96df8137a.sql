-- Add reactions column to messages table (JSON object: { emoji: [username, ...] })
ALTER TABLE public.messages ADD COLUMN reactions jsonb DEFAULT '{}'::jsonb;
