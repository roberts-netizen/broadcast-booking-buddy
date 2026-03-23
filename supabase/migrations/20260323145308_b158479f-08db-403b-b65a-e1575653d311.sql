
-- 1. Add category_type to categories
ALTER TABLE categories 
  ADD COLUMN IF NOT EXISTS category_type TEXT DEFAULT 'adv';

-- 2. Add category_id to takers
ALTER TABLE takers
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- 3. Create booking_sources table
CREATE TABLE IF NOT EXISTS booking_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  name TEXT,
  protocol TEXT,
  host TEXT,
  stream_key TEXT,
  audio1 TEXT,
  audio2 TEXT,
  settings TEXT,
  contact TEXT,
  status TEXT DEFAULT 'not_tested',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_sources_booking_id 
  ON booking_sources(booking_id);

ALTER TABLE booking_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read booking_sources" ON booking_sources FOR SELECT TO public USING (true);
CREATE POLICY "Public insert booking_sources" ON booking_sources FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public update booking_sources" ON booking_sources FOR UPDATE TO public USING (true);
CREATE POLICY "Public delete booking_sources" ON booking_sources FOR DELETE TO public USING (true);

-- 4. Skip hogmore_streams alterations - columns already exist

-- 5. Add category_id to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
