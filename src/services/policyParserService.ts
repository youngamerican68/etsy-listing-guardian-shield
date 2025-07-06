import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ScrapedPolicy {
  title: string;
  url: string;
  content: string;
  category: string;
  lastUpdated?: string;
}

export interface PolicyParserResult {
  success: boolean;
  message: string;
  policiesProcessed: number;
  sectionsCreated: number;
  keywordsExtracted: number;
}

class PolicyParserService {
  async scrapeEtsyPolicies(categories?: string[]): Promise<ScrapedPolicy[]> {
    try {
      const { data, error } = await supabase.functions.invoke('scrape-etsy-policies', {
        body: { categories }
      });

      if (error) {
        throw new Error(`Scraping failed: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Scraping failed');
      }

      return data.policies;
    } catch (error) {
      console.error('Error scraping Etsy policies:', error);
      throw error;
    }
  }

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

      const result: PolicyParserResult = {
        success: true,
        message: `Successfully processed ${policiesProcessed} policies, created ${sectionsCreated} sections, and extracted ${keywordsExtracted} keywords.`,
        policiesProcessed,
        sectionsCreated,
        keywordsExtracted
      };

      return result;

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

  async parseAllEtsyPolicies(): Promise<PolicyParserResult> {
    try {
      toast({
        title: "Starting Policy Parsing",
        description: "Scraping and processing Etsy's terms of service...",
      });

      // Step 1: Scrape all policies
      const policies = await this.scrapeEtsyPolicies();
      
      if (policies.length === 0) {
        throw new Error('No policies were successfully scraped');
      }

      toast({
        title: "Scraping Complete",
        description: `Found ${policies.length} policies. Processing with AI...`,
      });

      // Step 2: Process with AI
      const result = await this.processScrapedPolicies(policies);

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

  async getStoredPolicies() {
    const { data, error } = await supabase
      .from('etsy_policies')
      .select(`
        *,
        policy_sections (
          id,
          section_title,
          category,
          risk_level,
          plain_english_summary,
          policy_keywords (count)
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch stored policies: ${error.message}`);
    }

    return data;
  }

  async getPolicyKeywords(sectionId?: string) {
    let query = supabase
      .from('policy_keywords')
      .select(`
        *,
        policy_sections (
          section_title,
          category,
          etsy_policies (title)
        )
      `)
      .eq('is_active', true);

    if (sectionId) {
      query = query.eq('policy_section_id', sectionId);
    }

    const { data, error } = await query.order('risk_level', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch policy keywords: ${error.message}`);
    }

    return data;
  }
}

export const policyParserService = new PolicyParserService();