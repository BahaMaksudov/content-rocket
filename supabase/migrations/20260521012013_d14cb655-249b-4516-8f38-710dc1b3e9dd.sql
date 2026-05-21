
CREATE TABLE public.public_blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID,
  user_id UUID NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  tl_dr TEXT,
  insights JSONB NOT NULL DEFAULT '[]'::jsonb,
  youtube_url TEXT,
  youtube_video_id TEXT,
  meta_description TEXT,
  author_name TEXT,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_public_blog_posts_published_created
  ON public.public_blog_posts (published, created_at DESC);
CREATE INDEX idx_public_blog_posts_slug ON public.public_blog_posts (slug);

ALTER TABLE public.public_blog_posts ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authenticated) can read published posts
CREATE POLICY "Anyone can view published blog posts"
ON public.public_blog_posts
FOR SELECT
USING (published = true);

-- No INSERT/UPDATE/DELETE policies → only service role can write.

CREATE TRIGGER trg_public_blog_posts_updated_at
BEFORE UPDATE ON public.public_blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
