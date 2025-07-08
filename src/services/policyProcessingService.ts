import { supabase } from '@/integrations/supabase/client';

export interface PolicyParserResult {
  success: boolean;
  message: string;
  policiesProcessed: number;
  sectionsCreated: number;
  keywordsExtracted: number;
}

export class PolicyProcessingService {
  async processLocalPolicies(): Promise<PolicyParserResult> {
    // This method is now deprecated - use policyJobService.startPolicyAnalysis() instead
    throw new Error('This method is deprecated. Use policyJobService.startPolicyAnalysis() for async processing.');
  }
}

export const policyProcessingService = new PolicyProcessingService();