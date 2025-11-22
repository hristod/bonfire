-- Remove current_secret_code from discovery API
-- Users should only get secret after proving proximity via location

DROP FUNCTION IF EXISTS find_nearby_bonfires(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER);

CREATE OR REPLACE FUNCTION find_nearby_bonfires(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  max_distance_meters INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  creator_id UUID,
  creator_nickname TEXT,
  creator_avatar_url TEXT,
  distance_meters DOUBLE PRECISION,
  participant_count BIGINT,
  has_pin BOOLEAN,
  expires_at TIMESTAMPTZ,
  proximity_radius_meters INTEGER
  -- NOTE: current_secret_code intentionally removed for security
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.description,
    b.creator_id,
    p.nickname AS creator_nickname,
    p.avatar_url AS creator_avatar_url,
    ST_Distance(
      b.location_point,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) AS distance_meters,
    (SELECT COUNT(*) FROM bonfire_participants WHERE bonfire_id = b.id) AS participant_count,
    b.has_pin,
    b.expires_at,
    b.proximity_radius_meters
  FROM bonfires b
  JOIN profiles p ON p.id = b.creator_id
  WHERE
    b.is_active = true
    AND b.expires_at > NOW()
    AND ST_DWithin(
      b.location_point,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      max_distance_meters
    )
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get secret code (only after proximity verified)
-- Returns secret only if user is within bonfire's proximity radius
CREATE OR REPLACE FUNCTION get_bonfire_secret(
  p_bonfire_id UUID,
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION
) RETURNS TEXT AS $$
DECLARE
  v_bonfire RECORD;
  v_distance DOUBLE PRECISION;
BEGIN
  -- Get bonfire with location
  SELECT * INTO v_bonfire
  FROM bonfires
  WHERE id = p_bonfire_id
    AND is_active = true
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bonfire not found or expired';
  END IF;

  -- Calculate distance from user to bonfire
  SELECT ST_Distance(
    v_bonfire.location_point,
    ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
  ) INTO v_distance;

  -- Check if user is within proximity radius
  IF v_distance > v_bonfire.proximity_radius_meters THEN
    RAISE EXCEPTION 'You must be within % meters to get the secret code', v_bonfire.proximity_radius_meters;
  END IF;

  -- Return secret code
  RETURN v_bonfire.current_secret_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
