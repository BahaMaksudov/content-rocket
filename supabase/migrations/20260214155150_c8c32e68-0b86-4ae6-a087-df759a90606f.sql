-- Allow anonymous/public access to featured testimonials for embed
CREATE POLICY "Public can view featured testimonials"
ON public.testimonials
FOR SELECT
USING (is_featured = true);