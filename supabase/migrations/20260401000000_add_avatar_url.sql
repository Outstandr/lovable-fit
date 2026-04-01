-- Add avatar_url to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true) 
ON CONFLICT (id) DO NOTHING;

-- Establish RLS policies for avatars bucket
-- 1. Anyone can view avatars
CREATE POLICY "Avatar images are publicly accessible."
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'avatars' );

-- 2. Authenticated users can upload their own avatar
CREATE POLICY "Users can upload their own avatar."
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'avatars' AND auth.uid() = owner );

-- 3. Authenticated users can update their own avatar
CREATE POLICY "Users can update their own avatar."
  ON storage.objects FOR UPDATE
  WITH CHECK ( bucket_id = 'avatars' AND auth.uid() = owner );

-- 4. Authenticated users can delete their own avatar
CREATE POLICY "Users can delete their own avatar."
  ON storage.objects FOR DELETE
  USING ( bucket_id = 'avatars' AND auth.uid() = owner );


-- Drop existing functions to change return types
DROP FUNCTION IF EXISTS public.get_today_leaderboard();
DROP FUNCTION IF EXISTS public.get_weekly_leaderboard();
DROP FUNCTION IF EXISTS public.get_monthly_leaderboard();

-- Recreate get_today_leaderboard with avatar_url
CREATE FUNCTION public.get_today_leaderboard()
RETURNS TABLE(
  user_id uuid, display_name text, avatar_initials text, username text, avatar_id text, avatar_url text,
  steps integer, distance_km numeric, calories integer, current_streak integer, rank bigint
)
LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS user_id, COALESCE(p.display_name, 'User') AS display_name, COALESCE(p.avatar_initials, 'NA') AS avatar_initials,
    p.username, p.avatar_id, p.avatar_url,
    COALESCE(ds.steps, 0) AS steps, COALESCE(ds.distance_km, 0) AS distance_km, COALESCE(ds.calories, 0) AS calories,
    COALESCE(s.current_streak, 0) AS current_streak,
    ROW_NUMBER() OVER (ORDER BY COALESCE(ds.steps, 0) DESC, ds.updated_at ASC) AS rank
  FROM public.profiles p
  LEFT JOIN public.daily_steps ds ON p.id = ds.user_id AND ds.date = CURRENT_DATE
  LEFT JOIN public.streaks s ON p.id = s.user_id
  ORDER BY steps DESC, ds.updated_at ASC;
END;
$$;

-- Recreate get_weekly_leaderboard with avatar_url
CREATE FUNCTION public.get_weekly_leaderboard()
RETURNS TABLE(
  user_id uuid, display_name text, avatar_initials text, username text, avatar_id text, avatar_url text,
  total_steps bigint, current_streak integer, rank bigint
)
LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS user_id, COALESCE(p.display_name, 'User') AS display_name, COALESCE(p.avatar_initials, 'NA') AS avatar_initials,
    p.username, p.avatar_id, p.avatar_url,
    COALESCE(SUM(ds.steps), 0)::BIGINT AS total_steps,
    COALESCE(s.current_streak, 0) AS current_streak,
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(ds.steps), 0) DESC) AS rank
  FROM public.profiles p
  LEFT JOIN public.daily_steps ds ON p.id = ds.user_id 
      AND ds.date >= DATE_TRUNC('week', CURRENT_DATE) AND ds.date <= CURRENT_DATE
  LEFT JOIN public.streaks s ON p.id = s.user_id
  GROUP BY p.id, p.display_name, p.avatar_initials, p.username, p.avatar_id, p.avatar_url, s.current_streak
  ORDER BY total_steps DESC;
END;
$$;

-- Recreate get_monthly_leaderboard with avatar_url
CREATE FUNCTION public.get_monthly_leaderboard()
RETURNS TABLE(
  user_id uuid, display_name text, avatar_initials text, username text, avatar_id text, avatar_url text,
  total_steps bigint, current_streak integer, rank bigint
)
LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS user_id, COALESCE(p.display_name, 'User') AS display_name, COALESCE(p.avatar_initials, 'NA') AS avatar_initials,
    p.username, p.avatar_id, p.avatar_url,
    COALESCE(SUM(ds.steps), 0)::BIGINT AS total_steps,
    COALESCE(s.current_streak, 0) AS current_streak,
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(ds.steps), 0) DESC) AS rank
  FROM public.profiles p
  LEFT JOIN public.daily_steps ds ON p.id = ds.user_id 
      AND ds.date >= DATE_TRUNC('month', CURRENT_DATE) AND ds.date <= CURRENT_DATE
  LEFT JOIN public.streaks s ON p.id = s.user_id
  GROUP BY p.id, p.display_name, p.avatar_initials, p.username, p.avatar_id, p.avatar_url, s.current_streak
  ORDER BY total_steps DESC;
END;
$$;
