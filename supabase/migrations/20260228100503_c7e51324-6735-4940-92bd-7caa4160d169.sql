
-- Add advanced fields to tournaments for ATP/WTA and ONE-OFF types
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS venue_name text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS pm_name text,
  ADD COLUMN IF NOT EXISTS pm_contact text,
  ADD COLUMN IF NOT EXISTS crew_notes text,
  ADD COLUMN IF NOT EXISTS satellite_info text,
  ADD COLUMN IF NOT EXISTS encoding_details text,
  ADD COLUMN IF NOT EXISTS channel_config text;
