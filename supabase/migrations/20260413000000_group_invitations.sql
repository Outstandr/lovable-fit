-- ============================================================
-- Migration: Group Invitations + User Search
-- ============================================================

-- 1. Create group_invitations table
CREATE TABLE IF NOT EXISTS public.group_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.friend_groups(id) ON DELETE CASCADE NOT NULL,
  invited_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  invited_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(group_id, invited_user_id)
);

-- 2. Enable RLS
ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Users can see invitations they sent or received
CREATE POLICY "Users can view their invitations"
  ON public.group_invitations FOR SELECT
  USING (auth.uid() = invited_by OR auth.uid() = invited_user_id);

-- Members of a group can invite others
CREATE POLICY "Group members can send invitations"
  ON public.group_invitations FOR INSERT
  WITH CHECK (
    auth.uid() = invited_by
    AND group_id IN (SELECT group_id FROM public.friend_group_members WHERE user_id = auth.uid())
  );

-- Invited users can update their own invitations (accept/reject)
CREATE POLICY "Invited users can respond to invitations"
  ON public.group_invitations FOR UPDATE
  USING (auth.uid() = invited_user_id);

-- Senders can delete/cancel their invitations
CREATE POLICY "Senders can cancel invitations"
  ON public.group_invitations FOR DELETE
  USING (auth.uid() = invited_by);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_group_invitations_invited_user ON public.group_invitations(invited_user_id, status);
CREATE INDEX IF NOT EXISTS idx_group_invitations_group ON public.group_invitations(group_id);

-- 5. RPC: Search users for invite (by username or display_name)
CREATE OR REPLACE FUNCTION public.search_users_for_invite(
  search_query text,
  exclude_group_id uuid
)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  username text,
  avatar_url text,
  avatar_id text,
  avatar_initials text,
  already_member boolean,
  already_invited boolean
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    p.id AS user_id,
    p.display_name,
    p.username,
    p.avatar_url,
    p.avatar_id,
    p.avatar_initials,
    EXISTS (
      SELECT 1 FROM public.friend_group_members fgm
      WHERE fgm.group_id = exclude_group_id AND fgm.user_id = p.id
    ) AS already_member,
    EXISTS (
      SELECT 1 FROM public.group_invitations gi
      WHERE gi.group_id = exclude_group_id AND gi.invited_user_id = p.id AND gi.status = 'pending'
    ) AS already_invited
  FROM public.profiles p
  WHERE (
    p.username ILIKE '%' || search_query || '%'
    OR p.display_name ILIKE '%' || search_query || '%'
  )
  AND p.id != auth.uid()
  ORDER BY
    CASE WHEN p.username ILIKE search_query || '%' THEN 0 ELSE 1 END,
    p.display_name
  LIMIT 20;
$$;

-- 6. RPC: Get pending invitations for current user
CREATE OR REPLACE FUNCTION public.get_pending_invitations(target_user_id uuid)
RETURNS TABLE (
  id uuid,
  group_id uuid,
  group_name text,
  group_emoji text,
  invited_by_name text,
  invited_by_avatar text,
  member_count bigint,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    gi.id,
    gi.group_id,
    fg.name AS group_name,
    fg.emoji AS group_emoji,
    inviter.display_name AS invited_by_name,
    inviter.avatar_url AS invited_by_avatar,
    (SELECT COUNT(*) FROM public.friend_group_members WHERE group_id = fg.id) AS member_count,
    gi.created_at
  FROM public.group_invitations gi
  JOIN public.friend_groups fg ON fg.id = gi.group_id
  JOIN public.profiles inviter ON inviter.id = gi.invited_by
  WHERE gi.invited_user_id = target_user_id
    AND gi.status = 'pending'
  ORDER BY gi.created_at DESC;
$$;
