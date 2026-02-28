
-- Create categories table
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'standard' CHECK (type IN ('standard', 'advanced')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public insert categories" ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update categories" ON public.categories FOR UPDATE USING (true);
CREATE POLICY "Public delete categories" ON public.categories FOR DELETE USING (true);

-- Seed default categories
INSERT INTO public.categories (name, type) VALUES
  ('MCR', 'standard'),
  ('ONE-OFF', 'advanced'),
  ('ATP', 'advanced');
