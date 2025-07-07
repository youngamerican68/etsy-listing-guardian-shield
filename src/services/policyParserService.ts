import { toast } from '@/hooks/use-toast';
import { policyProcessingService, PolicyParserResult } from './policyProcessingService';
import { policyDataService } from './policyDataService';

// Re-export types for backward compatibility
export type { PolicyParserResult } from './policyProcessingService';

class PolicyParserService {
  async parseAllEtsyPolicies(): Promise<PolicyParserResult> {
    try {
      toast({
        title: "Starting Policy Parsing",
        description: "Processing Etsy's terms of service from local file...",
      });

      // Process policies from local file with AI
      const result = await policyProcessingService.processLocalPolicies();

      if (result.success) {
        toast({
          title: "Policy Parsing Complete",
          description: result.message,
        });
      } else {
        toast({
          title: "Policy Parsing Failed",
          description: result.message,
          variant: "destructive",
        });
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        title: "Policy Parsing Failed",
        description: errorMessage,
        variant: "destructive",
      });

      return {
        success: false,
        message: errorMessage,
        policiesProcessed: 0,
        sectionsCreated: 0,
        keywordsExtracted: 0
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