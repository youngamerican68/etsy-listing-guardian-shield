import { toast } from '@/hooks/use-toast';
import { etsyScrapingService } from './etsyScrapingService';
import { policyProcessingService, PolicyParserResult } from './policyProcessingService';
import { policyDataService } from './policyDataService';

// Re-export types for backward compatibility
export type { ScrapedPolicy } from './etsyScrapingService';
export type { PolicyParserResult } from './policyProcessingService';

class PolicyParserService {
  async parseAllEtsyPolicies(): Promise<PolicyParserResult> {
    try {
      toast({
        title: "Starting Policy Parsing",
        description: "Scraping and processing Etsy's terms of service...",
      });

      // Step 1: Scrape all policies
      const policies = await etsyScrapingService.scrapeEtsyPolicies();
      
      if (policies.length === 0) {
        throw new Error('No policies were successfully scraped');
      }

      toast({
        title: "Scraping Complete",
        description: `Found ${policies.length} policies. Processing with AI...`,
      });

      // Step 2: Process with AI
      const result = await policyProcessingService.processScrapedPolicies(policies);

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