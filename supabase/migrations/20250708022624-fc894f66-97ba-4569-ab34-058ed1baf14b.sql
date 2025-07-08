-- Create policy analysis jobs table for tracking background processing
CREATE TABLE public.policy_analysis_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  progress_message TEXT,
  policies_processed INTEGER DEFAULT 0,
  sections_created INTEGER DEFAULT 0,
  keywords_extracted INTEGER DEFAULT 0,
  total_policies INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.policy_analysis_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for job access
CREATE POLICY "Users can view their own analysis jobs" 
ON public.policy_analysis_jobs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analysis jobs" 
ON public.policy_analysis_jobs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update job status" 
ON public.policy_analysis_jobs 
FOR UPDATE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_policy_analysis_jobs_updated_at
BEFORE UPDATE ON public.policy_analysis_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();