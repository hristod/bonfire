-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Bonfires table
CREATE TABLE bonfires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) >= 3 AND char_length(name) <= 50),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 200),

  -- Location
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location_point GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
  proximity_radius_meters INTEGER NOT NULL DEFAULT 30 CHECK (proximity_radius_meters BETWEEN 10 AND 100),

  -- Security
  current_secret_code TEXT NOT NULL,
  secret_window_start TIMESTAMPTZ NOT NULL,
  has_pin BOOLEAN NOT NULL DEFAULT false,
  pin_hash TEXT,

  -- Lifecycle
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Constraints
  CONSTRAINT valid_pin_configuration CHECK (
    (has_pin = false AND pin_hash IS NULL) OR
    (has_pin = true AND pin_hash IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX bonfires_location_idx ON bonfires USING GIST (location_point);
CREATE INDEX bonfires_active_idx ON bonfires (is_active, expires_at) WHERE is_active = true;
CREATE INDEX bonfires_creator_idx ON bonfires (creator_id);

-- Bonfire participants
CREATE TABLE bonfire_participants (
  bonfire_id UUID NOT NULL REFERENCES bonfires(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (bonfire_id, user_id)
);

CREATE INDEX bonfire_participants_user_idx ON bonfire_participants (user_id);
CREATE INDEX bonfire_participants_last_seen_idx ON bonfire_participants (bonfire_id, last_seen_at);

-- Chat messages
CREATE TABLE bonfire_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bonfire_id UUID NOT NULL REFERENCES bonfires(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image')),
  content TEXT,

  -- Image attachments
  image_url TEXT,
  image_width INTEGER,
  image_height INTEGER,
  image_size_bytes INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure valid content based on message type
  CONSTRAINT valid_message_content CHECK (
    (message_type = 'text' AND content IS NOT NULL AND char_length(content) > 0 AND char_length(content) <= 2000) OR
    (message_type = 'image' AND image_url IS NOT NULL AND (content IS NULL OR char_length(content) <= 500))
  )
);

CREATE INDEX bonfire_messages_bonfire_idx ON bonfire_messages (bonfire_id, created_at DESC);
CREATE INDEX bonfire_messages_type_idx ON bonfire_messages (bonfire_id, message_type, created_at DESC);

-- RLS Policies for bonfires
ALTER TABLE bonfires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active bonfires"
  ON bonfires FOR SELECT
  USING (is_active = true AND expires_at > NOW());

CREATE POLICY "Creators can insert their own bonfires"
  ON bonfires FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their own bonfires"
  ON bonfires FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their own bonfires"
  ON bonfires FOR DELETE
  USING (auth.uid() = creator_id);

-- RLS Policies for bonfire_participants
ALTER TABLE bonfire_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read their bonfire members"
  ON bonfire_participants FOR SELECT
  USING (
    bonfire_id IN (
      SELECT bonfire_id FROM bonfire_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert themselves via join flow"
  ON bonfire_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation"
  ON bonfire_participants FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for bonfire_messages
ALTER TABLE bonfire_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read bonfire messages"
  ON bonfire_messages FOR SELECT
  USING (
    bonfire_id IN (
      SELECT bonfire_id FROM bonfire_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can send messages"
  ON bonfire_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    bonfire_id IN (
      SELECT bonfire_id FROM bonfire_participants WHERE user_id = auth.uid()
    )
  );
