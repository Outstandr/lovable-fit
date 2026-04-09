-- ============================================================
-- COMPLETE FIX: Drop and recreate all friend group policies
-- Run this ONCE in Supabase SQL Editor to fix all RLS issues
-- ============================================================

-- 1. Create helper function (bypasses RLS to check membership)
CREATE OR REPLACE FUNCTION public.is_group_member(gid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friend_group_members
    WHERE group_id = gid AND user_id = auth.uid()
  );
$$;

-- 2. Drop ALL existing policies on both tables
DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.friend_groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.friend_groups;
DROP POLICY IF EXISTS "Group creator can update group" ON public.friend_groups;
DROP POLICY IF EXISTS "Group creator can delete group" ON public.friend_groups;
DROP POLICY IF EXISTS "Members can view group members" ON public.friend_group_members;
DROP POLICY IF EXISTS "Users can join groups" ON public.friend_group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON public.friend_group_members;

-- 3. Recreate friend_groups policies
-- SELECT: creator OR member can view
CREATE POLICY "View own groups"
  ON public.friend_groups FOR SELECT
  USING (created_by = auth.uid() OR public.is_group_member(id));

-- INSERT: authenticated user sets themselves as creator
CREATE POLICY "Create groups"
  ON public.friend_groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- UPDATE: only creator
CREATE POLICY "Update own groups"
  ON public.friend_groups FOR UPDATE
  USING (auth.uid() = created_by);

-- DELETE: only creator
CREATE POLICY "Delete own groups"
  ON public.friend_groups FOR DELETE
  USING (auth.uid() = created_by);

-- 4. Recreate friend_group_members policies
-- SELECT: can see members of groups you belong to (uses helper, no recursion)
CREATE POLICY "View group members"
  ON public.friend_group_members FOR SELECT
  USING (public.is_group_member(group_id));

-- INSERT: can only add yourself
CREATE POLICY "Join groups"
  ON public.friend_group_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- DELETE: can only remove yourself
CREATE POLICY "Leave groups"
  ON public.friend_group_members FOR DELETE
  USING (auth.uid() = user_id);
