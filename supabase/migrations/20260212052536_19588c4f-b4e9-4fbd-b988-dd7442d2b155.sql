
-- Add is_admin column to chat_users
ALTER TABLE public.chat_users ADD COLUMN is_admin boolean NOT NULL DEFAULT false;

-- Set amit as admin
UPDATE public.chat_users SET is_admin = true WHERE username = 'amit';
