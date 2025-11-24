-- Enable realtime for bonfire_messages table
-- This allows clients to subscribe to INSERT/UPDATE/DELETE events via Supabase Realtime

-- Add bonfire_messages to the supabase_realtime publication
-- This enables Change Data Capture (CDC) for the table
ALTER PUBLICATION supabase_realtime ADD TABLE bonfire_messages;
