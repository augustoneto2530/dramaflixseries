-- Add unique constraint for upsert to work properly
ALTER TABLE public.watch_progress 
ADD CONSTRAINT watch_progress_user_episode_unique 
UNIQUE (user_id, episode_id);