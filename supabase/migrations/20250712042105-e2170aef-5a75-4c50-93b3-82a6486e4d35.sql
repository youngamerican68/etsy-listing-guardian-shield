UPDATE policy_analysis_jobs 
SET status = 'failed', 
    error_message = 'Job manually stopped by user', 
    completed_at = now(),
    progress_message = 'Processing stopped by user request'
WHERE status IN ('pending', 'running')