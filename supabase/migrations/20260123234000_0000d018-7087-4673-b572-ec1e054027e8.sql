-- Create leads table for traffic metrics
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('google', 'meta', 'linkedin')),
  niche TEXT,
  lead_count INTEGER NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  campaign_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (same as clients)
CREATE POLICY "Anyone can read leads" ON public.leads FOR SELECT USING (true);
CREATE POLICY "Anyone can insert leads" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update leads" ON public.leads FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete leads" ON public.leads FOR DELETE USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add niche column to clients for segmentation
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS niche TEXT;