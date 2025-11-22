-- Function to find nearby bonfires using PostGIS
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
  current_secret_code TEXT,
  expires_at TIMESTAMPTZ,
  proximity_radius_meters INTEGER
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
    b.current_secret_code,
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

-- Function to validate bonfire join attempt
CREATE OR REPLACE FUNCTION validate_bonfire_join(
  p_bonfire_id UUID,
  p_secret_code TEXT,
  p_pin_code TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_bonfire RECORD;
BEGIN
  -- Fetch bonfire details
  SELECT * INTO v_bonfire
  FROM bonfires
  WHERE id = p_bonfire_id
    AND is_active = true
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Validate secret code (exact match for now, time-windowed logic handled in app)
  IF v_bonfire.current_secret_code != p_secret_code THEN
    RETURN false;
  END IF;

  -- Validate PIN if required
  IF v_bonfire.has_pin THEN
    IF p_pin_code IS NULL THEN
      RETURN false;
    END IF;

    -- Use pgcrypto for bcrypt comparison
    IF NOT (crypt(p_pin_code, v_bonfire.pin_hash) = v_bonfire.pin_hash) THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update participant's last_seen_at (for presence tracking)
CREATE OR REPLACE FUNCTION update_participant_presence(
  p_bonfire_id UUID,
  p_user_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE bonfire_participants
  SET last_seen_at = NOW()
  WHERE bonfire_id = p_bonfire_id
    AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get bonfire with participant details
CREATE OR REPLACE FUNCTION get_bonfire_with_participants(
  p_bonfire_id UUID
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  creator_id UUID,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  proximity_radius_meters INTEGER,
  expires_at TIMESTAMPTZ,
  participant_id UUID,
  participant_nickname TEXT,
  participant_avatar_url TEXT,
  participant_joined_at TIMESTAMPTZ,
  participant_last_seen_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.description,
    b.creator_id,
    b.latitude,
    b.longitude,
    b.proximity_radius_meters,
    b.expires_at,
    bp.user_id AS participant_id,
    p.nickname AS participant_nickname,
    p.avatar_url AS participant_avatar_url,
    bp.joined_at AS participant_joined_at,
    bp.last_seen_at AS participant_last_seen_at
  FROM bonfires b
  LEFT JOIN bonfire_participants bp ON bp.bonfire_id = b.id
  LEFT JOIN profiles p ON p.id = bp.user_id
  WHERE b.id = p_bonfire_id
    AND b.is_active = true
    AND b.expires_at > NOW()
  ORDER BY bp.joined_at ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
