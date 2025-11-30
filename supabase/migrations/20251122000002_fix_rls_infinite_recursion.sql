-- Fix infinite recursion in RLS policies
-- The previous policies queried bonfire_participants from within bonfire_participants policy
-- which causes infinite recursion when the table is joined with profiles via FK

-- Create a security definer function to check bonfire membership
-- This bypasses RLS when checking membership, avoiding infinite recursion
CREATE OR REPLACE FUNCTION is_bonfire_participant(p_bonfire_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM bonfire_participants
    WHERE bonfire_id = p_bonfire_id AND user_id = p_user_id
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_bonfire_participant(UUID, UUID) TO authenticated;

-- Drop the problematic policies
DROP POLICY IF EXISTS "Participants can read their bonfire members" ON bonfire_participants;
DROP POLICY IF EXISTS "Participants can read bonfire messages" ON bonfire_messages;
DROP POLICY IF EXISTS "Participants can send messages" ON bonfire_messages;

-- Recreate bonfire_participants SELECT policy using the security definer function
CREATE POLICY "Participants can read their bonfire members"
  ON bonfire_participants FOR SELECT
  USING (
    -- User can always read their own participation records
    user_id = auth.uid()
    OR
    -- User can read other participants if they are in the same bonfire
    is_bonfire_participant(bonfire_id, auth.uid())
  );

-- Recreate bonfire_messages SELECT policy using the security definer function
CREATE POLICY "Participants can read bonfire messages"
  ON bonfire_messages FOR SELECT
  USING (
    is_bonfire_participant(bonfire_id, auth.uid())
  );

-- Recreate bonfire_messages INSERT policy using the security definer function
CREATE POLICY "Participants can send messages"
  ON bonfire_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND is_bonfire_participant(bonfire_id, auth.uid())
  );
