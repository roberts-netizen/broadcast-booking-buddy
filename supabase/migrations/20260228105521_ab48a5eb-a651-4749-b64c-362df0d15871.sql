
CREATE TABLE public.booking_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid NOT NULL UNIQUE,
  impact_level text NOT NULL DEFAULT 'low',
  description text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read booking_reports" ON public.booking_reports FOR SELECT USING (true);
CREATE POLICY "Public insert booking_reports" ON public.booking_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update booking_reports" ON public.booking_reports FOR UPDATE USING (true);
CREATE POLICY "Public delete booking_reports" ON public.booking_reports FOR DELETE USING (true);

CREATE TRIGGER update_booking_reports_updated_at
  BEFORE UPDATE ON public.booking_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
