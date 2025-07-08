import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, RefreshCw, Play } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { policyJobService, PolicyAnalysisJob } from '@/services/policyJobService';
import { toast } from '@/hooks/use-toast';

interface JobProgressMonitorProps {
  jobId?: string;
  onJobComplete?: () => void;
}

const JobProgressMonitor = ({ jobId, onJobComplete }: JobProgressMonitorProps) => {
  const [job, setJob] = useState<PolicyAnalysisJob | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const fetchJobStatus = async (currentJobId: string) => {
    try {
      const jobData = await policyJobService.getJobStatus(currentJobId);
      setJob(jobData);
      
      if (jobData?.status === 'completed') {
        setIsPolling(false);
        onJobComplete?.();
        toast({
          title: "Analysis Complete",
          description: `Successfully processed ${jobData.policies_processed} policies!`,
        });
      } else if (jobData?.status === 'failed') {
        setIsPolling(false);
        toast({
          title: "Analysis Failed",
          description: jobData.error_message || "The analysis job failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching job status:', error);
    }
  };

  const startPolling = (currentJobId: string) => {
    if (isPolling) return;
    
    setIsPolling(true);
    const interval = setInterval(async () => {
      await fetchJobStatus(currentJobId);
      
      // Check if job is complete or failed to stop polling
      const currentJob = await policyJobService.getJobStatus(currentJobId);
      if (currentJob?.status === 'completed' || currentJob?.status === 'failed') {
        clearInterval(interval);
        setIsPolling(false);
      }
    }, 2000); // Poll every 2 seconds

    // Cleanup interval on unmount
    return () => {
      clearInterval(interval);
      setIsPolling(false);
    };
  };

  useEffect(() => {
    if (jobId) {
      fetchJobStatus(jobId);
      if (job?.status === 'pending' || job?.status === 'running') {
        const cleanup = startPolling(jobId);
        return cleanup;
      }
    }
  }, [jobId, job?.status]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateProgress = () => {
    if (!job || job.total_policies === 0) return 0;
    return Math.round((job.policies_processed / job.total_policies) * 100);
  };

  if (!job) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No active analysis job</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Policy Analysis Progress</span>
          <Badge className={getStatusColor(job.status)}>
            {getStatusIcon(job.status)}
            <span className="ml-2 capitalize">{job.status}</span>
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(job.status === 'running' || job.status === 'pending') && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{calculateProgress()}%</span>
            </div>
            <Progress value={calculateProgress()} className="w-full" />
            <p className="text-sm text-muted-foreground">
              {job.progress_message || 'Processing...'}
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-blue-600">
              {job.policies_processed}
            </div>
            <div className="text-xs text-muted-foreground">
              Policies Processed
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-green-600">
              {job.sections_created}
            </div>
            <div className="text-xs text-muted-foreground">
              Sections Created
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-purple-600">
              {job.keywords_extracted}
            </div>
            <div className="text-xs text-muted-foreground">
              Keywords Extracted
            </div>
          </div>
        </div>

        {job.status === 'failed' && job.error_message && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{job.error_message}</AlertDescription>
          </Alert>
        )}

        {job.status === 'completed' && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Analysis completed successfully! All policy data has been processed and is now available.
            </AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <div>Started: {job.started_at ? new Date(job.started_at).toLocaleString() : 'Not started'}</div>
          {job.completed_at && (
            <div>Completed: {new Date(job.completed_at).toLocaleString()}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default JobProgressMonitor;