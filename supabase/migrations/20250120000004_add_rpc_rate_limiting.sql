-- Rate limiting for RPC functions
CREATE TABLE rpc_rate_limits (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  function_name TEXT NOT NULL,
  call_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, function_name, window_start)
);

-- Index for efficient queries and cleanup
CREATE INDEX rpc_rate_limits_window_idx ON rpc_rate_limits (window_start);
CREATE INDEX rpc_rate_limits_user_function_idx ON rpc_rate_limits (user_id, function_name);

-- Enable RLS
ALTER TABLE rpc_rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can view their own rate limits
CREATE POLICY "Users can view own rate limits"
  ON rpc_rate_limits FOR SELECT
  USING (user_id = auth.uid());

-- Cleanup old rate limit records (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rpc_rate_limits
  WHERE window_start < NOW() - interval '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check rate limit for a function
CREATE OR REPLACE FUNCTION check_rpc_rate_limit(
  p_function_name TEXT,
  p_max_calls INTEGER,
  p_window_seconds INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  -- Calculate window start (rounded down to nearest minute)
  v_window_start := date_trunc('minute', NOW());

  -- Count calls in the time window
  SELECT COALESCE(SUM(call_count), 0) INTO v_count
  FROM rpc_rate_limits
  WHERE user_id = auth.uid()
    AND function_name = p_function_name
    AND window_start > NOW() - (p_window_seconds || ' seconds')::interval;

  -- Check if over limit
  IF v_count >= p_max_calls THEN
    RETURN false;
  END IF;

  -- Record this call
  INSERT INTO rpc_rate_limits (user_id, function_name, window_start)
  VALUES (auth.uid(), p_function_name, v_window_start)
  ON CONFLICT (user_id, function_name, window_start)
  DO UPDATE SET call_count = rpc_rate_limits.call_count + 1;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
