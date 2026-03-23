
CREATE TABLE IF NOT EXISTS hogmore_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'taker',
  slot_number INTEGER DEFAULT 1,
  name TEXT,
  status TEXT DEFAULT 'not_tested',
  protocol TEXT,
  host TEXT,
  stream_key TEXT,
  audio1 TEXT,
  audio2 TEXT,
  settings TEXT,
  contact TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hogmore_streams_booking_id 
  ON hogmore_streams(booking_id);

ALTER TABLE hogmore_streams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read hogmore_streams" ON hogmore_streams FOR SELECT TO public USING (true);
CREATE POLICY "Public insert hogmore_streams" ON hogmore_streams FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public update hogmore_streams" ON hogmore_streams FOR UPDATE TO public USING (true);
CREATE POLICY "Public delete hogmore_streams" ON hogmore_streams FOR DELETE TO public USING (true);
