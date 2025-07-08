import { toast } from '@/hooks/use-toast';
import { policyDataService } from './policyDataService';
import { policyJobService, StartJobResult } from './policyJobService';

// Legacy interface for backward compatibility
export interface PolicyParserResult {
  success: boolean;
  message: string;
  policiesProcessed: number;
  sectionsCreated: number;
  keywordsExtracted: number;
}

class PolicyParserService {
  async parseAllEtsyPolicies(): Promise<StartJobResult> {
    try {
      toast({
        title: "Starting Policy Analysis",
        description: "Queuing analysis job...",
      });

      // Start async policy analysis job
      const result = await policyJobService.startPolicyAnalysis();

      if (result.success) {
        toast({
          title: "Policy Analysis Started",
          description: "Background processing started. You can monitor progress below.",
        });
      } else {
        toast({
          title: "Failed to Start Analysis",
          description: result.message,
          variant: "destructive",
        });
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        title: "Failed to Start Analysis",
        description: errorMessage,
        variant: "destructive",
      });

      return {
        success: false,
        message: errorMessage
      };
    }
  }

  // Delegate to data service
  async getStoredPolicies() {
    return policyDataService.getStoredPolicies();
  }

  async getPolicyKeywords(sectionId?: string) {
    return policyDataService.getPolicyKeywords(sectionId);
  }
}

export const policyParserService = new PolicyParserService();