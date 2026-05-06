-- Enum for conversation status
CREATE TYPE public.conversation_status AS ENUM ('open', 'in_progress', 'waiting_customer', 'resolved');

-- Enum for message direction
CREATE TYPE public.message_direction AS ENUM ('inbound', 'outbound');

-- Enum for message type
CREATE TYPE public.message_type AS ENUM ('text', 'image', 'document', 'template', 'system', 'internal_note');

-- Enum for user roles in inbox
CREATE TYPE public.inbox_role AS ENUM ('admin', 'supervisor', 'agent');

-- Contacts table (WhatsApp clients)
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  name TEXT,
  email TEXT,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  opt_out BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Conversations table (WhatsApp threads)
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  status conversation_status NOT NULL DEFAULT 'open',
  assigned_to UUID,
  last_message_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  unread_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  direction message_direction NOT NULL,
  type message_type NOT NULL DEFAULT 'text',
  body TEXT,
  media_url TEXT,
  wa_message_id TEXT,
  sent_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Quick reply templates
CREATE TABLE public.quick_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_whatsapp_template BOOLEAN NOT NULL DEFAULT false,
  meta_template_name TEXT,
  category TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Contact activities/timeline
CREATE TABLE public.contact_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  actor_id UUID,
  actor_name TEXT,
  action TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_contacts_phone ON public.contacts(phone);
CREATE INDEX idx_conversations_contact ON public.conversations(contact_id);
CREATE INDEX idx_conversations_status ON public.conversations(status);
CREATE INDEX idx_conversations_assigned ON public.conversations(assigned_to);
CREATE INDEX idx_conversations_last_message ON public.conversations(last_message_at DESC);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX idx_activities_contact ON public.contact_activities(contact_id);

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies (open for MVP, should be restricted later with auth)
CREATE POLICY "Anyone can read contacts" ON public.contacts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert contacts" ON public.contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update contacts" ON public.contacts FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete contacts" ON public.contacts FOR DELETE USING (true);

CREATE POLICY "Anyone can read conversations" ON public.conversations FOR SELECT USING (true);
CREATE POLICY "Anyone can insert conversations" ON public.conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update conversations" ON public.conversations FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete conversations" ON public.conversations FOR DELETE USING (true);

CREATE POLICY "Anyone can read messages" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Anyone can insert messages" ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update messages" ON public.messages FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete messages" ON public.messages FOR DELETE USING (true);

CREATE POLICY "Anyone can read quick_replies" ON public.quick_replies FOR SELECT USING (true);
CREATE POLICY "Anyone can insert quick_replies" ON public.quick_replies FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update quick_replies" ON public.quick_replies FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete quick_replies" ON public.quick_replies FOR DELETE USING (true);

CREATE POLICY "Anyone can read contact_activities" ON public.contact_activities FOR SELECT USING (true);
CREATE POLICY "Anyone can insert contact_activities" ON public.contact_activities FOR INSERT WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for inbox
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;