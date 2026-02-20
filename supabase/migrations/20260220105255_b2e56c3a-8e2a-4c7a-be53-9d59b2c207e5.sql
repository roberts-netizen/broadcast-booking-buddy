
-- Create booking_taker_assignments table
CREATE TABLE public.booking_taker_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  slot_number INTEGER NOT NULL,
  taker_id UUID REFERENCES public.takers(id) ON DELETE SET NULL,
  taker_channel_map_id UUID REFERENCES public.taker_channel_maps(id) ON DELETE SET NULL,
  actual_channel_id TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT booking_taker_assignments_slot_range CHECK (slot_number >= 1 AND slot_number <= 3),
  CONSTRAINT booking_taker_assignments_unique_slot UNIQUE (booking_id, slot_number)
);

ALTER TABLE public.booking_taker_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read booking_taker_assignments" ON public.booking_taker_assignments FOR SELECT USING (true);
CREATE POLICY "Public insert booking_taker_assignments" ON public.booking_taker_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update booking_taker_assignments" ON public.booking_taker_assignments FOR UPDATE USING (true);
CREATE POLICY "Public delete booking_taker_assignments" ON public.booking_taker_assignments FOR DELETE USING (true);

CREATE TRIGGER update_booking_taker_assignments_updated_at
  BEFORE UPDATE ON public.booking_taker_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing taker data from bookings into slot 1
INSERT INTO public.booking_taker_assignments (booking_id, slot_number, taker_id, taker_channel_map_id, actual_channel_id)
SELECT
  b.id,
  1,
  b.taker_id,
  b.taker_channel_map_id,
  COALESCE(tcm.actual_channel_id, '')
FROM public.bookings b
LEFT JOIN public.taker_channel_maps tcm ON tcm.id = b.taker_channel_map_id
WHERE b.taker_id IS NOT NULL OR b.taker_channel_map_id IS NOT NULL;

-- Drop old taker columns from bookings
ALTER TABLE public.bookings DROP COLUMN IF EXISTS taker_id;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS taker_channel_map_id;
