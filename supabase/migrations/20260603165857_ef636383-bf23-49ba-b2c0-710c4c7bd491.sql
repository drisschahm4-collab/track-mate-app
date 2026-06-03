CREATE TABLE public.login_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_sub text,
  username text,
  email text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.login_events TO anon, authenticated;
GRANT ALL ON public.login_events TO service_role;
ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert login events" ON public.login_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE INDEX login_events_created_at_idx ON public.login_events (created_at DESC);