-- Allow authenticated users to discover non-private profiles.
-- Keep private profiles visible only to their owner.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can read visible profiles" ON public.profiles;

CREATE POLICY "Authenticated users can read visible profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR network_visibility IN ('public', 'friends')
);
