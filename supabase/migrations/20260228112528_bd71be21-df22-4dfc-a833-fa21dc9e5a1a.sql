
-- Add event-level fields to bookings for advanced projects
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS venue text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS source text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS project_lead text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS audio_setup text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS event_notes text DEFAULT NULL;

-- Add phone_number to taker_assignments
ALTER TABLE public.taker_assignments
  ADD COLUMN IF NOT EXISTS phone_number text DEFAULT NULL;

-- Create project_taker_endpoints for primary/backup endpoints
CREATE TABLE public.project_taker_endpoints (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  taker_assignment_id uuid NOT NULL REFERENCES public.taker_assignments(id) ON DELETE CASCADE,
  endpoint_type text NOT NULL DEFAULT 'primary' CHECK (endpoint_type IN ('primary', 'backup')),
  protocol text,
  host text,
  port text,
  stream_key text,
  username text,
  password text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(taker_assignment_id, endpoint_type)
);

ALTER TABLE public.project_taker_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read project_taker_endpoints" ON public.project_taker_endpoints FOR SELECT USING (true);
CREATE POLICY "Public insert project_taker_endpoints" ON public.project_taker_endpoints FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update project_taker_endpoints" ON public.project_taker_endpoints FOR UPDATE USING (true);
CREATE POLICY "Public delete project_taker_endpoints" ON public.project_taker_endpoints FOR DELETE USING (true);
