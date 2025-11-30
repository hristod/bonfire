-- Add periodic cleanup jobs using pg_cron
-- Note: pg_cron must be enabled in Supabase project settings

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Cleanup old PIN attempts every hour
SELECT cron.schedule(
  'cleanup-pin-attempts',
  '0 * * * *', -- Every hour at minute 0
  $$SELECT cleanup_old_pin_attempts()$$
);

-- Cleanup old RPC rate limits every hour
SELECT cron.schedule(
  'cleanup-rpc-rate-limits',
  '5 * * * *', -- Every hour at minute 5
  $$SELECT cleanup_old_rate_limits()$$
);

-- Cleanup expired bonfires daily
SELECT cron.schedule(
  'cleanup-expired-bonfires',
  '0 2 * * *', -- Daily at 2 AM
  $$
  DELETE FROM bonfires
  WHERE expires_at < NOW() - interval '24 hours'
    AND is_active = false
  $$
);

-- Log successful scheduling
DO $$
BEGIN
  RAISE NOTICE 'Cleanup cron jobs scheduled successfully';
END $$;
