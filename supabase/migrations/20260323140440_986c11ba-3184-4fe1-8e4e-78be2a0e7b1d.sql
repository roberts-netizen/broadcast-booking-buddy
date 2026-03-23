CREATE TABLE public.tonybet_channel_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  taker_name text,
  label text NOT NULL,
  actual_channel_id text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tonybet_channel_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read tonybet_channel_maps" ON tonybet_channel_maps FOR SELECT TO public USING (true);
CREATE POLICY "Public insert tonybet_channel_maps" ON tonybet_channel_maps FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public update tonybet_channel_maps" ON tonybet_channel_maps FOR UPDATE TO public USING (true);
CREATE POLICY "Public delete tonybet_channel_maps" ON tonybet_channel_maps FOR DELETE TO public USING (true);