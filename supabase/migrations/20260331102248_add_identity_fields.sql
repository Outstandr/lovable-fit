-- Add username and avatar_id to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS avatar_id TEXT;

-- Index for quick username lookups
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles (username);

-- Update handle_new_user function to handle phone_number from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  raw_first TEXT := COALESCE(NEW.raw_user_meta_data ->> 'first_name', '');
  raw_last TEXT := COALESCE(NEW.raw_user_meta_data ->> 'last_name', '');
  derived_display_name TEXT;
  derived_avatar_initials TEXT;
BEGIN
  -- Create derived fields
  IF raw_first <> '' AND raw_last <> '' THEN
    derived_display_name := initcap(raw_first) || ' ' || initcap(raw_last);
    derived_avatar_initials := upper(left(raw_first, 1)) || upper(left(raw_last, 1));
  ELSIF raw_first <> '' THEN
    derived_display_name := initcap(raw_first);
    derived_avatar_initials := upper(left(raw_first, 2));
  ELSE
    derived_display_name := 'User';
    derived_avatar_initials := 'U';
  END IF;

  INSERT INTO public.profiles (
    id, 
    display_name, 
    first_name,
    last_name,
    phone_number,
    avatar_initials,
    registration_source
  )
  VALUES (
    NEW.id,
    derived_display_name,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.raw_user_meta_data ->> 'phone_number',
    UPPER(
      LEFT(COALESCE(NEW.raw_user_meta_data ->> 'first_name', 'U'), 1) ||
      LEFT(COALESCE(NEW.raw_user_meta_data ->> 'last_name', 'N'), 1)
    ),
    COALESCE(NEW.raw_app_meta_data ->> 'provider', 'email')
  );
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Initialize streak
  INSERT INTO public.streaks (user_id, current_streak, longest_streak)
  VALUES (NEW.id, 0, 0);
  
  RETURN NEW;
END;
$$;

-- Drop existing functions to change return types
DROP FUNCTION IF EXISTS public.get_today_leaderboard();
DROP FUNCTION IF EXISTS public.get_weekly_leaderboard();
DROP FUNCTION IF EXISTS public.get_monthly_leaderboard();

-- Recreate get_today_leaderboard with identity
CREATE FUNCTION public.get_today_leaderboard()
RETURNS TABLE(
  user_id uuid, display_name text, avatar_initials text, username text, avatar_id text,
  steps integer, distance_km numeric, calories integer, current_streak integer, rank bigint
)
LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS user_id, COALESCE(p.display_name, 'User') AS display_name, COALESCE(p.avatar_initials, 'NA') AS avatar_initials,
    p.username, p.avatar_id,
    COALESCE(ds.steps, 0) AS steps, COALESCE(ds.distance_km, 0) AS distance_km, COALESCE(ds.calories, 0) AS calories,
    COALESCE(s.current_streak, 0) AS current_streak,
    ROW_NUMBER() OVER (ORDER BY COALESCE(ds.steps, 0) DESC, ds.updated_at ASC) AS rank
  FROM public.profiles p
  LEFT JOIN public.daily_steps ds ON p.id = ds.user_id AND ds.date = CURRENT_DATE
  LEFT JOIN public.streaks s ON p.id = s.user_id
  ORDER BY steps DESC, ds.updated_at ASC;
END;
$$;

-- Recreate get_weekly_leaderboard with identity
CREATE FUNCTION public.get_weekly_leaderboard()
RETURNS TABLE(
  user_id uuid, display_name text, avatar_initials text, username text, avatar_id text,
  total_steps bigint, current_streak integer, rank bigint
)
LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS user_id, COALESCE(p.display_name, 'User') AS display_name, COALESCE(p.avatar_initials, 'NA') AS avatar_initials,
    p.username, p.avatar_id,
    COALESCE(SUM(ds.steps), 0)::BIGINT AS total_steps,
    COALESCE(s.current_streak, 0) AS current_streak,
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(ds.steps), 0) DESC) AS rank
  FROM public.profiles p
  LEFT JOIN public.daily_steps ds ON p.id = ds.user_id 
      AND ds.date >= DATE_TRUNC('week', CURRENT_DATE) AND ds.date <= CURRENT_DATE
  LEFT JOIN public.streaks s ON p.id = s.user_id
  GROUP BY p.id, p.display_name, p.avatar_initials, p.username, p.avatar_id, s.current_streak
  ORDER BY total_steps DESC;
END;
$$;

-- Recreate get_monthly_leaderboard with identity
CREATE FUNCTION public.get_monthly_leaderboard()
RETURNS TABLE(
  user_id uuid, display_name text, avatar_initials text, username text, avatar_id text,
  total_steps bigint, current_streak integer, rank bigint
)
LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS user_id, COALESCE(p.display_name, 'User') AS display_name, COALESCE(p.avatar_initials, 'NA') AS avatar_initials,
    p.username, p.avatar_id,
    COALESCE(SUM(ds.steps), 0)::BIGINT AS total_steps,
    COALESCE(s.current_streak, 0) AS current_streak,
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(ds.steps), 0) DESC) AS rank
  FROM public.profiles p
  LEFT JOIN public.daily_steps ds ON p.id = ds.user_id 
      AND ds.date >= DATE_TRUNC('month', CURRENT_DATE) AND ds.date <= CURRENT_DATE
  LEFT JOIN public.streaks s ON p.id = s.user_id
  GROUP BY p.id, p.display_name, p.avatar_initials, p.username, p.avatar_id, s.current_streak
  ORDER BY total_steps DESC;
END;
$$;
