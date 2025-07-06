import { supabase } from '@/integrations/supabase/client';
import { ScrapedPolicy } from './etsyScrapingService';

export interface PolicyParserResult {
  success: boolean;
  message: string;
  policiesProcessed: number;
  sectionsCreated: number;
  keywordsExtracted: number;
}

export class PolicyProcessingService {
  async processScrapedPolicies(policies: ScrapedPolicy[]): Promise<PolicyParserResult> {
    let policiesProcessed = 0;
    let sectionsCreated = 0;
    let keywordsExtracted = 0;

    try {
      for (const policy of policies) {
        // First, store the policy in the database
        const { data: policyData, error: policyError } = await supabase
          .from('etsy_policies')
          .upsert({
            title: policy.title,
            url: policy.url,
            content: policy.content,
            category: policy.category,
            last_updated: policy.lastUpdated ? new Date(policy.lastUpdated).toISOString() : null,
            scraped_at: new Date().toISOString(),
            is_active: true
          }, {
            onConflict: 'url'
          })
          .select()
          .single();

        if (policyError) {
          console.error(`Error storing policy ${policy.title}:`, policyError);
          continue;
        }

        // Process the policy with AI
        const { data: aiData, error: aiError } = await supabase.functions.invoke('process-policies-ai', {
          body: {
            policyId: policyData.id,
            content: policy.content,
            title: policy.title
          }
        });

        if (aiError) {
          console.error(`Error processing policy ${policy.title} with AI:`, aiError);
          continue;
        }

        if (aiData.success) {
          policiesProcessed++;
          sectionsCreated += aiData.sections_processed;
          
          // Count keywords extracted
          for (const section of aiData.sections) {
            keywordsExtracted += section.keywords_count || 0;
          }
        }
      }

      return {
        success: true,
        message: `Successfully processed ${policiesProcessed} policies, created ${sectionsCreated} sections, and extracted ${keywordsExtracted} keywords.`,
        policiesProcessed,
        sectionsCreated,
        keywordsExtracted
      };

    } catch (error) {
      console.error('Error processing scraped policies:', error);
      return {
        success: false,
        message: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        policiesProcessed,
        sectionsCreated,
        keywordsExtracted
      };
    }
  }
}

export const policyProcessingService = new PolicyProcessingService();