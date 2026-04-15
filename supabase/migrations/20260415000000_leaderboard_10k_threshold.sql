-- ============================================================
-- 10,000 Step Qualifying Threshold for Leaderboards
-- Users must complete 10,000 steps to appear on the leaderboard.
-- Below that, they are hidden from rankings.
-- ============================================================

-- 1. Today Leaderboard: Only users with >= 10,000 steps today
DROP FUNCTION IF EXISTS public.get_today_leaderboard();
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
  INNER JOIN public.daily_steps ds ON p.id = ds.user_id AND ds.date = CURRENT_DATE
  LEFT JOIN public.streaks s ON p.id = s.user_id
  WHERE ds.steps >= 10000
  ORDER BY steps DESC, ds.updated_at ASC;
END;
$$;


-- 2. Weekly Leaderboard: Only users with >= 10,000 total steps this week
DROP FUNCTION IF EXISTS public.get_weekly_leaderboard();
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
  HAVING COALESCE(SUM(ds.steps), 0) >= 10000
  ORDER BY total_steps DESC;
END;
$$;


-- 3. Monthly Leaderboard: Only users with >= 10,000 total steps this month
DROP FUNCTION IF EXISTS public.get_monthly_leaderboard();
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
  HAVING COALESCE(SUM(ds.steps), 0) >= 10000
  ORDER BY total_steps DESC;
END;
$$;


-- 4. Country Leaderboard: Only users with >= 10,000 steps today
DROP FUNCTION IF EXISTS public.get_country_leaderboard(text);
CREATE OR REPLACE FUNCTION public.get_country_leaderboard(target_country text)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  username text,
  avatar_id text,
  avatar_initials text,
  avatar_url text,
  steps bigint,
  current_streak bigint,
  rank bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    p.id AS user_id,
    p.display_name,
    p.username,
    p.avatar_id,
    p.avatar_initials,
    p.avatar_url,
    COALESCE(ds.steps, 0)::bigint AS steps,
    COALESCE(s.current_streak, 0)::bigint AS current_streak,
    ROW_NUMBER() OVER (ORDER BY COALESCE(ds.steps, 0) DESC)::bigint AS rank
  FROM public.profiles p
  INNER JOIN public.daily_steps ds ON ds.user_id = p.id AND ds.date = CURRENT_DATE
  LEFT JOIN public.streaks s ON s.user_id = p.id
  WHERE p.country = target_country
    AND p.show_on_leaderboard IS NOT FALSE
    AND ds.steps >= 10000
  ORDER BY steps DESC;
$$;


-- 5. Group Leaderboard: Show all group members, but only rank those with >= 10,000 steps
-- Members below 10k still appear (greyed out on frontend) so you can see the full group
DROP FUNCTION IF EXISTS public.get_group_leaderboard(uuid);
CREATE OR REPLACE FUNCTION public.get_group_leaderboard(target_group_id uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  username text,
  avatar_id text,
  avatar_initials text,
  avatar_url text,
  steps bigint,
  current_streak bigint,
  rank bigint,
  qualified boolean
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    p.id AS user_id,
    p.display_name,
    p.username,
    p.avatar_id,
    p.avatar_initials,
    p.avatar_url,
    COALESCE(ds.steps, 0)::bigint AS steps,
    COALESCE(s.current_streak, 0)::bigint AS current_streak,
    CASE 
      WHEN COALESCE(ds.steps, 0) >= 10000 
      THEN ROW_NUMBER() OVER (
        ORDER BY CASE WHEN COALESCE(ds.steps, 0) >= 10000 THEN 0 ELSE 1 END,
        COALESCE(ds.steps, 0) DESC
      )::bigint
      ELSE 0::bigint
    END AS rank,
    (COALESCE(ds.steps, 0) >= 10000) AS qualified
  FROM public.friend_group_members fgm
  JOIN public.profiles p ON p.id = fgm.user_id
  LEFT JOIN public.daily_steps ds ON ds.user_id = p.id AND ds.date = CURRENT_DATE
  LEFT JOIN public.streaks s ON s.user_id = p.id
  WHERE fgm.group_id = target_group_id
  ORDER BY 
    CASE WHEN COALESCE(ds.steps, 0) >= 10000 THEN 0 ELSE 1 END,
    COALESCE(ds.steps, 0) DESC;
$$;
