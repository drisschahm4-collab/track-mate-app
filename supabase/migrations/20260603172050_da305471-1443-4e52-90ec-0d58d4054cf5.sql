CREATE TABLE public.privacy_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL CHECK (action IN ('ON', 'OFF')),
  device_id bigint,
  device_ident text,
  device_name text,
  plugin_id text NOT NULL,
  plugin_label text NOT NULL,
  actor_sub text,
  actor_email text,
  source text NOT NULL DEFAULT 'app',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.privacy_events TO service_role;
ALTER TABLE public.privacy_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX privacy_events_created_at_idx ON public.privacy_events (created_at DESC);
CREATE INDEX privacy_events_device_id_idx ON public.privacy_events (device_id);