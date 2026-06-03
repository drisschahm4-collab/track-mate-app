CREATE POLICY "No direct client access to privacy events"
ON public.privacy_events
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "Anyone can insert login events" ON public.login_events;
CREATE POLICY "Clients can add bounded login events"
ON public.login_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  created_at >= now() - interval '5 minutes'
  AND created_at <= now() + interval '1 minute'
  AND (user_sub IS NULL OR char_length(user_sub) <= 255)
  AND (username IS NULL OR char_length(username) <= 255)
  AND (email IS NULL OR char_length(email) <= 320)
  AND (user_agent IS NULL OR char_length(user_agent) <= 2000)
);