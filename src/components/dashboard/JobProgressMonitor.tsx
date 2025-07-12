import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface Job {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress_message?: string;
  error_message?: string;
  policies_processed?: number;
  total_policies?: number;
}

interface JobProgressMonitorProps {
  jobId: string;
  onJobComplete: () => void;
}

const JobProgressMonitor = ({ jobId, onJobComplete }: JobProgressMonitorProps) => {
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    // Function to fetch the latest job status
    const fetchJob = async () => {
      const { data, error } = await supabase
        .from('policy_analysis_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        setError('Could not load job status.');
        console.error('Error fetching job:', error);
      } else {
        // THIS IS THE FIX: Use a type assertion `as Job`
        setJob(data as Job);
        if (data.status === 'completed' || data.status === 'failed') {
          onJobComplete();
        }
      }
    };

    fetchJob();

    // Set up a real-time subscription to the jobs table
    const channel = supabase
      .channel(`job-progress-channel-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'policy_analysis_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          console.log('Job updated via real-time subscription:', payload.new);
          // The same type assertion is used here for safety
          const updatedJob = payload.new as Job;
          setJob(updatedJob);
          // When the job is finished, call the callback and unsubscribe
          if (updatedJob.status === 'completed' || updatedJob.status === 'failed') {
            onJobComplete();
            channel.unsubscribe();
          }
        }
      )
      .subscribe();

    // Cleanup function to remove the channel when the component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, onJobComplete]);

  if (error) {
    return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>;
  }

  if (!job) {
    return <div className="text-sm text-muted-foreground">Loading job status...</div>;
  }

  // Calculate progress percentage, defaulting to 0 if values are missing
  const progressValue = (job.policies_processed && job.total_policies)
    ? (job.policies_processed / job.total_policies) * 100
    : 0;
  
  const statusVariant = {
    running: 'default',
    pending: 'secondary',
    completed: 'success',
    failed: 'destructive',
  }[job.status] || 'default';

  return (
    <div className="p-4 border rounded-lg space-y-3">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium">Job Status: <Badge variant={statusVariant as any}>{job.status}</Badge></span>
        <span className="font-mono">
          {job.policies_processed || 0} / {job.total_policies || 'N/A'} Policies
        </span>
      </div>
      <Progress value={progressValue} className="w-full" />
      <p className="text-xs text-muted-foreground h-4">
        {job.progress_message || 'Awaiting progress...'}
      </p>
      {job.status === 'failed' && job.error_message && (
         <Alert variant="destructive"><AlertDescription>{job.error_message}</AlertDescription></Alert>
      )}
    </div>
  );
};

export default JobProgressMonitor;;