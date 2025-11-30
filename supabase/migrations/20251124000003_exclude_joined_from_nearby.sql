-- Modify find_nearby_bonfires to exclude bonfires user has already joined
-- This prevents duplicates between "My Bonfires" and "Nearby Bonfires" sections

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
  LEFT JOIN profiles p ON b.creator_id = p.id
  WHERE
    b.is_active = true
    AND b.expires_at > NOW()
    AND ST_DWithin(
      b.location_point,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      max_distance_meters
    )
    -- Exclude bonfires user has already joined
    AND NOT EXISTS (
      SELECT 1 FROM bonfire_participants bp
      WHERE bp.bonfire_id = b.id
      AND bp.user_id = auth.uid()
    )
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION find_nearby_bonfires(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated;
