-- Track PIN validation attempts for rate limiting
CREATE TABLE pin_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bonfire_id UUID NOT NULL REFERENCES bonfires(id) ON DELETE CASCADE,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  was_successful BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT unique_user_bonfire_attempt UNIQUE (user_id, bonfire_id, attempted_at)
);

-- Index for efficient cleanup and rate limit checks
CREATE INDEX pin_attempts_user_bonfire_idx ON pin_attempts (user_id, bonfire_id, attempted_at DESC);
CREATE INDEX pin_attempts_cleanup_idx ON pin_attempts (attempted_at) WHERE was_successful = false;

-- Enable RLS
ALTER TABLE pin_attempts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own attempts
CREATE POLICY "Users can view own PIN attempts"
  ON pin_attempts FOR SELECT
  USING (user_id = auth.uid());

-- Only functions can insert (prevent client manipulation)
CREATE POLICY "Only functions can insert attempts"
  ON pin_attempts FOR INSERT
  WITH CHECK (false);

-- Cleanup old attempts (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_pin_attempts()
RETURNS void AS $$
BEGIN
  DELETE FROM pin_attempts
  WHERE attempted_at < NOW() - interval '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check rate limit (5 failed attempts in 15 minutes)
CREATE OR REPLACE FUNCTION check_pin_rate_limit(
  p_user_id UUID,
  p_bonfire_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_failed_count INTEGER;
BEGIN
  -- Count failed attempts in last 15 minutes
  SELECT COUNT(*) INTO v_failed_count
  FROM pin_attempts
  WHERE user_id = p_user_id
    AND bonfire_id = p_bonfire_id
    AND was_successful = false
    AND attempted_at > NOW() - interval '15 minutes';

  -- Return true if under limit, false if rate limited
  RETURN v_failed_count < 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record attempt
CREATE OR REPLACE FUNCTION record_pin_attempt(
  p_user_id UUID,
  p_bonfire_id UUID,
  p_was_successful BOOLEAN
) RETURNS void AS $$
BEGIN
  INSERT INTO pin_attempts (user_id, bonfire_id, was_successful)
  VALUES (p_user_id, p_bonfire_id, p_was_successful);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
