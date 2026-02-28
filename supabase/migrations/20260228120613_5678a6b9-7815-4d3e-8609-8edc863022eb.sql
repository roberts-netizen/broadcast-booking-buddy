
-- Add CET end time to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cet_time_to time without time zone DEFAULT NULL;

-- Add custom taker name to taker_assignments (for when user types a name not in the takers list)
ALTER TABLE public.taker_assignments ADD COLUMN IF NOT EXISTS taker_custom_name text DEFAULT NULL;
