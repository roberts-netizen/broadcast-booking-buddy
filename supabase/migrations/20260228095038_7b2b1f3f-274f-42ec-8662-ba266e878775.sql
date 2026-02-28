
-- Create tournaments table
CREATE TABLE public.tournaments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'ONE-OFF',
  date_from DATE,
  date_to DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

-- Public access policies (matching existing pattern)
CREATE POLICY "Public read tournaments" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Public insert tournaments" ON public.tournaments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update tournaments" ON public.tournaments FOR UPDATE USING (true);
CREATE POLICY "Public delete tournaments" ON public.tournaments FOR DELETE USING (true);

-- Add tournament_id to bookings
ALTER TABLE public.bookings ADD COLUMN tournament_id UUID REFERENCES public.tournaments(id);

-- Trigger for updated_at
CREATE TRIGGER update_tournaments_updated_at
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
