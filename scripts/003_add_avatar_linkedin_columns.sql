-- Add avatar_url and linkedin_url if they don't exist (fixes "Could not find the 'avatar_url' column" error)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS avatar_url TEXT NOT NULL DEFAULT '';
