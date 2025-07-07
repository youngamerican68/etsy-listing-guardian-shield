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
    try {
      // Process all policies from the local policies.json file using AI
      const { data: aiData, error: aiError } = await supabase.functions.invoke('process-policies-ai', {
        body: {}
      });

      if (aiError) {
        console.error('Error processing policies with AI:', aiError);
        return {
          success: false,
          message: `Processing failed: ${aiError.message}`,
          policiesProcessed: 0,
          sectionsCreated: 0,
          keywordsExtracted: 0
        };
      }

      if (aiData.success) {
        return {
          success: true,
          message: aiData.message,
          policiesProcessed: aiData.policies_processed,
          sectionsCreated: aiData.sections_created,
          keywordsExtracted: aiData.keywords_extracted
        };
      } else {
        return {
          success: false,
          message: aiData.error || 'Processing failed',
          policiesProcessed: 0,
          sectionsCreated: 0,
          keywordsExtracted: 0
        };
      }

    } catch (error) {
      console.error('Error processing local policies:', error);
      return {
        success: false,
        message: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        policiesProcessed: 0,
        sectionsCreated: 0,
        keywordsExtracted: 0
      };
    }
  }
}

export const policyProcessingService = new PolicyProcessingService();