
-- Create the new taker_assignments table (replaces booking_taker_assignments)
CREATE TABLE IF NOT EXISTS public.taker_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  taker_id uuid REFERENCES public.takers(id) ON DELETE SET NULL,
  
  -- Technical details
  protocol text,                       -- SRT Pull / SRT Push / RTMP / RTP / Other
  host text,
  port text,
  stream_key_or_channel_id text,
  username text,
  password text,
  quality text,                        -- 1080p50 / 1080i50 / 720p50 / Custom
  audio text,
  
  -- Communication
  communication_method text,           -- WhatsApp / Email / Both / Other
  whatsapp_details text,
  email_subject text,
  communication_notes text,
  
  -- Testing
  test_datetime timestamptz,
  test_status text NOT NULL DEFAULT 'not_tested', -- not_tested / scheduled / tested / failed
  test_notes text,
  tested_by text,
  
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.taker_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read taker_assignments" ON public.taker_assignments FOR SELECT USING (true);
CREATE POLICY "Public insert taker_assignments" ON public.taker_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update taker_assignments" ON public.taker_assignments FOR UPDATE USING (true);
CREATE POLICY "Public delete taker_assignments" ON public.taker_assignments FOR DELETE USING (true);

-- Updated_at trigger
CREATE TRIGGER update_taker_assignments_updated_at
  BEFORE UPDATE ON public.taker_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookup by booking
CREATE INDEX idx_taker_assignments_booking_id ON public.taker_assignments(booking_id);
