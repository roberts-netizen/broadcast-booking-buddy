
CREATE TABLE public.league_taker_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  taker_channel_map_id uuid NOT NULL REFERENCES public.taker_channel_maps(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (league_id, taker_channel_map_id)
);

ALTER TABLE public.league_taker_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read league_taker_tags" ON public.league_taker_tags FOR SELECT TO public USING (true);
CREATE POLICY "Public insert league_taker_tags" ON public.league_taker_tags FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public update league_taker_tags" ON public.league_taker_tags FOR UPDATE TO public USING (true);
CREATE POLICY "Public delete league_taker_tags" ON public.league_taker_tags FOR DELETE TO public USING (true);

CREATE TABLE public.client_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  taker_channel_map_id uuid NOT NULL REFERENCES public.taker_channel_maps(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_access_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read client_access_tokens" ON public.client_access_tokens FOR SELECT TO public USING (true);
CREATE POLICY "Public insert client_access_tokens" ON public.client_access_tokens FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public update client_access_tokens" ON public.client_access_tokens FOR UPDATE TO public USING (true);
CREATE POLICY "Public delete client_access_tokens" ON public.client_access_tokens FOR DELETE TO public USING (true);
