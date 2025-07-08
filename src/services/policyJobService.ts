import { supabase } from '@/integrations/supabase/client';

export interface PolicyAnalysisJob {
  id: string;
  user_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress_message: string | null;
  policies_processed: number;
  sections_created: number;
  keywords_extracted: number;
  total_policies: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StartJobResult {
  success: boolean;
  jobId?: string;
  message: string;
  error?: string;
  existingJobId?: string;
}

class PolicyJobService {
  async startPolicyAnalysis(): Promise<StartJobResult> {
    try {
      const { data, error } = await supabase.functions.invoke('start-policy-analysis', {
        body: {}
      });

      if (error) {
        console.error('Error starting policy analysis:', error);
        return {
          success: false,
          message: `Failed to start analysis: ${error.message}`
        };
      }

      return data;
    } catch (error) {
      console.error('Error starting policy analysis:', error);
      return {
        success: false,
        message: `Failed to start analysis: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getJobStatus(jobId: string): Promise<PolicyAnalysisJob | null> {
    try {
      const { data, error } = await supabase
        .from('policy_analysis_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        console.error('Error fetching job status:', error);
        return null;
      }

      return data as PolicyAnalysisJob;
    } catch (error) {
      console.error('Error fetching job status:', error);
      return null;
    }
  }

  async getUserJobs(): Promise<PolicyAnalysisJob[]> {
    try {
      const { data, error } = await supabase
        .from('policy_analysis_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching user jobs:', error);
        return [];
      }

      return (data || []) as PolicyAnalysisJob[];
    } catch (error) {
      console.error('Error fetching user jobs:', error);
      return [];
    }
  }

  async getLatestJob(): Promise<PolicyAnalysisJob | null> {
    try {
      const { data, error } = await supabase
        .from('policy_analysis_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching latest job:', error);
        return null;
      }

      return data as PolicyAnalysisJob;
    } catch (error) {
      console.error('Error fetching latest job:', error);
      return null;
    }
  }
}

export const policyJobService = new PolicyJobService();