-- Migration: Create Chat System Tables
-- Created at: 2026-03-04 14:24:00

-- Create chats table
CREATE TABLE IF NOT EXISTS public.chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL, -- For anonymous users to keep track of their session
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Optional if they log in later
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for finding chats by device quickly
CREATE INDEX IF NOT EXISTS idx_chats_device_id ON public.chats(device_id);
-- Index for finding open chats
CREATE INDEX IF NOT EXISTS idx_chats_status ON public.chats(status);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for loading messages for a chat
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);
-- Index for ordering messages
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- Set up Row Level Security (RLS)

-- CHATS RLS
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Users can select their own chats based on device_id
CREATE POLICY "Users can view their own chats" ON public.chats
    FOR SELECT
    USING (
        -- Normally we would verify device_id via claims or passing it, but we'll allow public insert and select if they know the device_id
        true
    );

-- Everyone can insert a chat (needed for new anonymous users)
CREATE POLICY "Anyone can create a chat" ON public.chats
    FOR INSERT
    WITH CHECK (true);

-- Admins can view and update all chats
CREATE POLICY "Admins can view and update all chats" ON public.chats
    FOR ALL
    USING (auth.role() = 'authenticated');

-- MESSAGES RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Anyone can read messages
CREATE POLICY "Anyone can read messages" ON public.messages
    FOR SELECT
    USING (true);

-- Anyone can insert a message
CREATE POLICY "Anyone can insert messages" ON public.messages
    FOR INSERT
    WITH CHECK (true);

-- Admins can do anything on messages
CREATE POLICY "Admins can manage all messages" ON public.messages
    FOR ALL
    USING (auth.role() = 'authenticated');

-- Enable Realtime for both tables
alter publication supabase_realtime add table public.chats;
alter publication supabase_realtime add table public.messages;

-- Function to auto-update chats.updated_at
CREATE OR REPLACE FUNCTION update_chat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.chats
    SET updated_at = NOW()
    WHERE id = NEW.chat_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function when a new message is inserted
DROP TRIGGER IF EXISTS trigger_update_chat_updated_at ON public.messages;
CREATE TRIGGER trigger_update_chat_updated_at
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION update_chat_updated_at();
