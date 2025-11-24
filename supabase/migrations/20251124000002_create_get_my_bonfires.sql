-- Create function to get all bonfires the current user has joined
-- Returns bonfire data with participation metadata

CREATE OR REPLACE FUNCTION get_my_bonfires()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  creator_id UUID,
  creator_nickname TEXT,
  creator_avatar_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  proximity_radius_meters INTEGER,
  participant_count BIGINT,
  has_pin BOOLEAN,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN,
  is_creator BOOLEAN,
  joined_at TIMESTAMPTZ
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
    b.latitude,
    b.longitude,
    b.proximity_radius_meters,
    (SELECT COUNT(*) FROM bonfire_participants WHERE bonfire_id = b.id) AS participant_count,
    b.has_pin,
    b.expires_at,
    b.is_active,
    (b.creator_id = auth.uid()) AS is_creator,
    bp.joined_at
  FROM bonfires b
  INNER JOIN bonfire_participants bp ON b.id = bp.bonfire_id
  LEFT JOIN profiles p ON b.creator_id = p.id
  WHERE bp.user_id = auth.uid()
  ORDER BY
    b.is_active DESC,
    bp.joined_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_my_bonfires() TO authenticated;
