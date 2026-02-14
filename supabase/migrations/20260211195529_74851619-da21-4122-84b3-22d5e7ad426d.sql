
-- Create storage bucket for testimonial avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('testimonial-avatars', 'testimonial-avatars', true);

-- Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload testimonial avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'testimonial-avatars' AND auth.uid() IS NOT NULL);

-- Allow public read access
CREATE POLICY "Public can view testimonial avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'testimonial-avatars');

-- Allow users to delete their uploads
CREATE POLICY "Users can delete their testimonial avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'testimonial-avatars' AND auth.uid() IS NOT NULL);

-- Add avatar_url column to testimonials
ALTER TABLE public.testimonials ADD COLUMN avatar_url TEXT;
