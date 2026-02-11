-- One-time bootstrap for existing Supabase projects with legacy schema.
-- Safe to run multiple times.

-- Users: add avatar for current API response shape.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar VARCHAR(255);

-- Quizzes: add owner and text order mode used by current backend.
ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS user_id UUID;

ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS order_mode_text VARCHAR(20);

UPDATE public.quizzes
SET order_mode_text = CASE
  WHEN order_mode = 1 THEN '随机'
  ELSE '顺序'
END
WHERE order_mode_text IS NULL;

ALTER TABLE public.quizzes
  ALTER COLUMN order_mode_text SET DEFAULT '顺序';

-- Foreign key from quizzes.user_id -> users.id (if missing).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'quizzes_user_id_fkey'
  ) THEN
    ALTER TABLE public.quizzes
      ADD CONSTRAINT quizzes_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.users(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Helpful index for user-scoped quiz queries.
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id
  ON public.quizzes(user_id);
