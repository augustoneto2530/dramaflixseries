-- Allow public access to view non-adult content for browsing
CREATE POLICY "Public can view non-adult content for browsing"
ON public.contents
FOR SELECT
USING (is_adult = false);

-- Allow public to view all content metadata (but not watch)
-- This enables the homepage to show all content cards
CREATE POLICY "Public can view content metadata"
ON public.contents
FOR SELECT
USING (true);