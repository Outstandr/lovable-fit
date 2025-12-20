-- Drop existing functions first to change return types
DROP FUNCTION IF EXISTS public.get_today_leaderboard();
DROP FUNCTION IF EXISTS public.get_weekly_leaderboard();
DROP FUNCTION IF EXISTS public.get_monthly_leaderboard();

-- Recreate get_today_leaderboard with streak
CREATE FUNCTION public.get_today_leaderboard()
RETURNS TABLE(
  user_id uuid, 
  display_name text, 
  avatar_initials text, 
  steps integer, 
  distance_km numeric, 
  calories integer, 
  current_streak integer,
  rank bigint
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS user_id,
    COALESCE(p.display_name, 'User') AS display_name,
    COALESCE(p.avatar_initials, 'NA') AS avatar_initials,
    COALESCE(ds.steps, 0) AS steps,
    COALESCE(ds.distance_km, 0) AS distance_km,
    COALESCE(ds.calories, 0) AS calories,
    COALESCE(s.current_streak, 0) AS current_streak,
    ROW_NUMBER() OVER (ORDER BY COALESCE(ds.steps, 0) DESC, ds.updated_at ASC) AS rank
  FROM 
    public.profiles p
  LEFT JOIN 
    public.daily_steps ds ON p.id = ds.user_id AND ds.date = CURRENT_DATE
  LEFT JOIN
    public.streaks s ON p.id = s.user_id
  ORDER BY 
    steps DESC, ds.updated_at ASC;
END;
$function$;

-- Recreate get_weekly_leaderboard with streak
CREATE FUNCTION public.get_weekly_leaderboard()
RETURNS TABLE(
  user_id uuid, 
  display_name text, 
  avatar_initials text, 
  total_steps bigint,
  current_streak integer,
  rank bigint
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS user_id,
    COALESCE(p.display_name, 'User') AS display_name,
    COALESCE(p.avatar_initials, 'NA') AS avatar_initials,
    COALESCE(SUM(ds.steps), 0)::BIGINT AS total_steps,
    COALESCE(s.current_streak, 0) AS current_streak,
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(ds.steps), 0) DESC) AS rank
  FROM 
    public.profiles p
  LEFT JOIN 
    public.daily_steps ds ON p.id = ds.user_id 
      AND ds.date >= DATE_TRUNC('week', CURRENT_DATE)
      AND ds.date <= CURRENT_DATE
  LEFT JOIN
    public.streaks s ON p.id = s.user_id
  GROUP BY p.id, p.display_name, p.avatar_initials, s.current_streak
  ORDER BY total_steps DESC;
END;
$function$;

-- Recreate get_monthly_leaderboard with streak
CREATE FUNCTION public.get_monthly_leaderboard()
RETURNS TABLE(
  user_id uuid, 
  display_name text, 
  avatar_initials text, 
  total_steps bigint,
  current_streak integer,
  rank bigint
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS user_id,
    COALESCE(p.display_name, 'User') AS display_name,
    COALESCE(p.avatar_initials, 'NA') AS avatar_initials,
    COALESCE(SUM(ds.steps), 0)::BIGINT AS total_steps,
    COALESCE(s.current_streak, 0) AS current_streak,
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(ds.steps), 0) DESC) AS rank
  FROM 
    public.profiles p
  LEFT JOIN 
    public.daily_steps ds ON p.id = ds.user_id 
      AND ds.date >= DATE_TRUNC('month', CURRENT_DATE)
      AND ds.date <= CURRENT_DATE
  LEFT JOIN
    public.streaks s ON p.id = s.user_id
  GROUP BY p.id, p.display_name, p.avatar_initials, s.current_streak
  ORDER BY total_steps DESC;
END;
$function$;