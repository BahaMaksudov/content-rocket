
-- Create testimonials table
CREATE TABLE public.testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  author_name TEXT NOT NULL,
  author_title TEXT,
  content TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  source_url TEXT,
  source_platform TEXT, -- 'twitter', 'linkedin', 'google', 'other'
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own testimonials"
ON public.testimonials FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own testimonials"
ON public.testimonials FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own testimonials"
ON public.testimonials FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own testimonials"
ON public.testimonials FOR DELETE
USING (auth.uid() = user_id);

-- Auto-update timestamp trigger
CREATE TRIGGER update_testimonials_updated_at
BEFORE UPDATE ON public.testimonials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
