-- Create content clicks tracking table
CREATE TABLE public.content_clicks (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    content_id uuid NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
    user_id uuid,
    clicked_at timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_clicks ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX idx_content_clicks_content_id ON public.content_clicks(content_id);
CREATE INDEX idx_content_clicks_clicked_at ON public.content_clicks(clicked_at);

-- RLS Policies
CREATE POLICY "Anyone can insert clicks"
ON public.content_clicks
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all clicks"
ON public.content_clicks
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage clicks"
ON public.content_clicks
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));