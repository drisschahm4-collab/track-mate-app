ALTER TABLE public.privacy_events
  ADD COLUMN IF NOT EXISTS actor_username text,
  ADD COLUMN IF NOT EXISTS actor_ip text,
  ADD COLUMN IF NOT EXISTS actor_user_agent text;