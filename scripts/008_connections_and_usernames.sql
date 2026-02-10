-- Add usernames + connection requests/links so users can discover and connect.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx
  ON public.profiles (LOWER(username))
  WHERE username <> '';

-- Refresh profile read policy:
-- - own profile
-- - public/friends profiles
-- - connected users
-- - users with pending requests to/from you
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can read visible profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can read discoverable profiles" ON public.profiles;

CREATE POLICY "Authenticated users can read discoverable profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR network_visibility IN ('public', 'friends')
  OR EXISTS (
    SELECT 1
    FROM public.profile_connections pc
    WHERE (pc.user_a = id AND pc.user_b = auth.uid())
       OR (pc.user_b = id AND pc.user_a = auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.connection_requests cr
    WHERE cr.status = 'pending'
      AND (
        (cr.from_user_id = id AND cr.to_user_id = auth.uid())
        OR (cr.to_user_id = id AND cr.from_user_id = auth.uid())
      )
  )
);

CREATE TABLE IF NOT EXISTS public.profile_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT profile_connections_pair_check CHECK (user_a < user_b),
  CONSTRAINT profile_connections_unique_pair UNIQUE (user_a, user_b)
);

ALTER TABLE public.profile_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own connections" ON public.profile_connections;
CREATE POLICY "Users can read own connections"
ON public.profile_connections
FOR SELECT
TO authenticated
USING (user_a = auth.uid() OR user_b = auth.uid());

DROP POLICY IF EXISTS "Users can create own connections" ON public.profile_connections;
CREATE POLICY "Users can create own connections"
ON public.profile_connections
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (user_a = auth.uid() OR user_b = auth.uid())
);

CREATE TABLE IF NOT EXISTS public.connection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'canceled')),
  message TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT connection_requests_no_self CHECK (from_user_id <> to_user_id),
  CONSTRAINT connection_requests_unique_pair UNIQUE (from_user_id, to_user_id)
);

ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read related requests" ON public.connection_requests;
CREATE POLICY "Users can read related requests"
ON public.connection_requests
FOR SELECT
TO authenticated
USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create outgoing requests" ON public.connection_requests;
CREATE POLICY "Users can create outgoing requests"
ON public.connection_requests
FOR INSERT
TO authenticated
WITH CHECK (from_user_id = auth.uid() AND to_user_id <> auth.uid());

DROP POLICY IF EXISTS "Users can update related requests" ON public.connection_requests;
CREATE POLICY "Users can update related requests"
ON public.connection_requests
FOR UPDATE
TO authenticated
USING (from_user_id = auth.uid() OR to_user_id = auth.uid())
WITH CHECK (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- Security-definer lookup for exact username search (supports private profiles by handle).
CREATE OR REPLACE FUNCTION public.find_profile_by_username(p_username TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  username TEXT,
  initials TEXT,
  title TEXT,
  company TEXT,
  city TEXT,
  country TEXT,
  network_visibility TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.name,
    p.username,
    p.initials,
    p.title,
    p.company,
    p.city,
    p.country,
    p.network_visibility
  FROM public.profiles p
  WHERE p.username <> ''
    AND LOWER(p.username) = LOWER(TRIM(p_username))
    AND p.id <> auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_profile_by_username(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_profile_by_username(TEXT) TO authenticated;
