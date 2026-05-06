-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT,
  last_recording_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (since this is a simple client management system)
CREATE POLICY "Anyone can read clients"
  ON public.clients FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert clients"
  ON public.clients FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update clients"
  ON public.clients FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete clients"
  ON public.clients FOR DELETE
  USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample clients
INSERT INTO public.clients (name, last_recording_date) VALUES
  ('Ana Silva', '2024-11-01'),
  ('Bruno Costa', '2024-12-15'),
  ('Carla Dias', '2024-10-20'),
  ('Daniel Lima', '2025-01-05'),
  ('Elena Ramos', '2024-09-10'),
  ('Felipe Nunes', NULL),
  ('Gabriela Melo', '2024-11-28'),
  ('Hugo Ferreira', '2024-08-15'),
  ('Isabela Santos', '2025-01-10'),
  ('João Pedro', '2024-12-01'),
  ('Karen Oliveira', NULL),
  ('Lucas Martins', '2024-10-05');