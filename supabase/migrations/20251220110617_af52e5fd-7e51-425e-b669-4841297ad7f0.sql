CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard()
RETURNS TABLE(
  user_id uuid, 
  display_name text, 
  avatar_initials text, 
  total_steps bigint, 
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
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(ds.steps), 0) DESC) AS rank
  FROM 
    public.profiles p
  LEFT JOIN 
    public.daily_steps ds ON p.id = ds.user_id 
      AND ds.date >= DATE_TRUNC('week', CURRENT_DATE)
      AND ds.date <= CURRENT_DATE
  GROUP BY p.id, p.display_name, p.avatar_initials
  ORDER BY total_steps DESC;
END;
$function$;