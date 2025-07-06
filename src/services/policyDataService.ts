import { supabase } from '@/integrations/supabase/client';

export class PolicyDataService {
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

export const policyDataService = new PolicyDataService();