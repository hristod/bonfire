-- Add foreign key from bonfire_messages.user_id to profiles.id
-- This allows PostgREST to automatically join bonfire_messages with profiles
-- Required for queries like: SELECT *, profiles:user_id (nickname, avatar_url) FROM bonfire_messages

ALTER TABLE bonfire_messages
  ADD CONSTRAINT bonfire_messages_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Also add FK for bonfire_participants.user_id to profiles.id for consistency
ALTER TABLE bonfire_participants
  ADD CONSTRAINT bonfire_participants_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Also add FK for bonfires.creator_id to profiles.id for consistency
ALTER TABLE bonfires
  ADD CONSTRAINT bonfires_creator_id_profiles_fkey
  FOREIGN KEY (creator_id) REFERENCES profiles(id) ON DELETE CASCADE;
