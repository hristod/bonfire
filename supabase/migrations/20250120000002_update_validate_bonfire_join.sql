-- Update validate_bonfire_join to include PIN rate limiting
-- Replaces previous version from 20250119000003

DROP FUNCTION IF EXISTS validate_bonfire_join(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION validate_bonfire_join(
  p_bonfire_id UUID,
  p_secret_code TEXT,
  p_pin_code TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_bonfire RECORD;
  v_under_limit BOOLEAN;
BEGIN
  -- Get bonfire details
  SELECT * INTO v_bonfire
  FROM bonfires
  WHERE id = p_bonfire_id
    AND is_active = true
    AND expires_at > NOW();

  -- Bonfire not found or expired
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Validate secret code (exact match)
  IF v_bonfire.current_secret_code != p_secret_code THEN
    RETURN false;
  END IF;

  -- If bonfire has PIN, validate it with rate limiting
  IF v_bonfire.has_pin THEN
    -- Check if user is under rate limit
    SELECT check_pin_rate_limit(auth.uid(), p_bonfire_id) INTO v_under_limit;

    -- Raise exception if rate limited (NO attempt recording here)
    IF NOT v_under_limit THEN
      RAISE EXCEPTION 'Too many failed PIN attempts. Please wait 15 minutes.';
    END IF;

    -- PIN required but not provided
    IF p_pin_code IS NULL THEN
      PERFORM record_pin_attempt(auth.uid(), p_bonfire_id, false);
      RETURN false;
    END IF;

    -- Use bcrypt for backward compatibility
    IF NOT (crypt(p_pin_code, v_bonfire.pin_hash) = v_bonfire.pin_hash) THEN
      PERFORM record_pin_attempt(auth.uid(), p_bonfire_id, false);
      RETURN false;
    END IF;

    -- PIN correct - record success
    PERFORM record_pin_attempt(auth.uid(), p_bonfire_id, true);
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
