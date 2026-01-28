-- Add target_language column to generations table to persist language selection
ALTER TABLE public.generations 
ADD COLUMN target_language TEXT DEFAULT NULL;