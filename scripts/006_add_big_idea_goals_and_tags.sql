-- Big Idea goals (newline-separated) and tags (comma-separated) for profile card
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS big_idea_goals TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tags TEXT NOT NULL DEFAULT '';
