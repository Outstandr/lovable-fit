-- Create policy for authenticated users to read audiobook files
CREATE POLICY "Authenticated users can read audiobook files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'rbd-audiobook' AND auth.role() = 'authenticated');