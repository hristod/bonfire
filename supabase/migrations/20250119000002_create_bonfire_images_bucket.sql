-- Create bonfire-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bonfire-images',
  'bonfire-images',
  false,
  10485760, -- 10MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
);

-- Allow bonfire participants to view images in their bonfires
CREATE POLICY "Participants can view bonfire images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'bonfire-images'
    AND (storage.foldername(name))[1] IN (
      SELECT bonfire_id::text
      FROM bonfire_participants
      WHERE user_id = auth.uid()
    )
  );

-- Allow participants to upload images to their bonfires
CREATE POLICY "Participants can upload bonfire images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bonfire-images'
    AND (storage.foldername(name))[1] IN (
      SELECT bonfire_id::text
      FROM bonfire_participants
      WHERE user_id = auth.uid()
    )
  );

-- Allow senders to delete their recent images (within 5 minutes)
CREATE POLICY "Senders can delete recent images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'bonfire-images'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND created_at > NOW() - INTERVAL '5 minutes'
  );
