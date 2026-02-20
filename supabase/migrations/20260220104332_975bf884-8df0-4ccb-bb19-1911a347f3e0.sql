
-- Leagues lookup table
CREATE TABLE public.leagues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read leagues" ON public.leagues FOR SELECT USING (true);
CREATE POLICY "Public insert leagues" ON public.leagues FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update leagues" ON public.leagues FOR UPDATE USING (true);
CREATE POLICY "Public delete leagues" ON public.leagues FOR DELETE USING (true);

-- Incoming channels lookup table
CREATE TABLE public.incoming_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.incoming_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read incoming_channels" ON public.incoming_channels FOR SELECT USING (true);
CREATE POLICY "Public insert incoming_channels" ON public.incoming_channels FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update incoming_channels" ON public.incoming_channels FOR UPDATE USING (true);
CREATE POLICY "Public delete incoming_channels" ON public.incoming_channels FOR DELETE USING (true);

-- Takers lookup table
CREATE TABLE public.takers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.takers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read takers" ON public.takers FOR SELECT USING (true);
CREATE POLICY "Public insert takers" ON public.takers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update takers" ON public.takers FOR UPDATE USING (true);
CREATE POLICY "Public delete takers" ON public.takers FOR DELETE USING (true);

-- Taker channel map lookup table
CREATE TABLE public.taker_channel_maps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  actual_channel_id TEXT NOT NULL,
  taker_id UUID REFERENCES public.takers(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.taker_channel_maps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read taker_channel_maps" ON public.taker_channel_maps FOR SELECT USING (true);
CREATE POLICY "Public insert taker_channel_maps" ON public.taker_channel_maps FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update taker_channel_maps" ON public.taker_channel_maps FOR UPDATE USING (true);
CREATE POLICY "Public delete taker_channel_maps" ON public.taker_channel_maps FOR DELETE USING (true);

-- Main bookings table
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  gmt_time TIME NOT NULL DEFAULT '00:00:00',
  cet_time TIME,
  league_id UUID REFERENCES public.leagues(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL DEFAULT '',
  incoming_channel_id UUID REFERENCES public.incoming_channels(id) ON DELETE SET NULL,
  work_order_id TEXT NOT NULL DEFAULT '',
  taker_id UUID REFERENCES public.takers(id) ON DELETE SET NULL,
  taker_channel_map_id UUID REFERENCES public.taker_channel_maps(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read bookings" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "Public insert bookings" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update bookings" ON public.bookings FOR UPDATE USING (true);
CREATE POLICY "Public delete bookings" ON public.bookings FOR DELETE USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed some sample data
INSERT INTO public.leagues (name) VALUES ('Premier League'), ('Champions League'), ('La Liga'), ('Bundesliga'), ('Serie A');
INSERT INTO public.incoming_channels (name) VALUES ('Sky Sports 1'), ('Sky Sports 2'), ('BT Sport 1'), ('ESPN'), ('TNT Sports');
INSERT INTO public.takers (name) VALUES ('Alice Johnson'), ('Bob Smith'), ('Carol Davis'), ('Dan Wilson');
INSERT INTO public.taker_channel_maps (label, actual_channel_id, taker_id) 
  SELECT 'TAKE-A1', 'CH-001', id FROM public.takers WHERE name = 'Alice Johnson';
INSERT INTO public.taker_channel_maps (label, actual_channel_id, taker_id) 
  SELECT 'TAKE-A2', 'CH-002', id FROM public.takers WHERE name = 'Alice Johnson';
INSERT INTO public.taker_channel_maps (label, actual_channel_id, taker_id) 
  SELECT 'TAKE-B1', 'CH-003', id FROM public.takers WHERE name = 'Bob Smith';
INSERT INTO public.taker_channel_maps (label, actual_channel_id, taker_id) 
  SELECT 'TAKE-C1', 'CH-004', id FROM public.takers WHERE name = 'Carol Davis';
