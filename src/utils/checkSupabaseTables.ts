// Check current state of Supabase tables to verify expansion results
import { supabase } from '@/integrations/supabase/client';

export async function checkSupabaseTables() {
  console.log('🔍 Checking Supabase tables...');
  
  try {
    // Check compliance rules
    const { data: complianceRules, error: rulesError } = await supabase
      .from('compliance_rules')
      .select('term, risk_level, reason')
      .order('risk_level', { ascending: false });

    if (rulesError) {
      throw new Error(`Failed to fetch compliance rules: ${rulesError.message}`);
    }

    // Check policy sections
    const { data: policySections, error: sectionsError } = await supabase
      .from('policy_sections')
      .select('section_title, category, risk_level, policy_id, plain_english_summary')
      .order('category');

    if (sectionsError) {
      throw new Error(`Failed to fetch policy sections: ${sectionsError.message}`);
    }

    // Check etsy policies
    const { data: etsyPolicies, error: policiesError } = await supabase
      .from('etsy_policies')
      .select('category, title, content, last_updated, version')
      .order('category');

    if (policiesError) {
      throw new Error(`Failed to fetch etsy policies: ${policiesError.message}`);
    }

    // Analyze compliance rules
    const rulesByRisk = complianceRules?.reduce((acc, rule) => {
      acc[rule.risk_level] = (acc[rule.risk_level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Find enhanced rules (ones that suggest they're from our expansion)
    const enhancedRules = complianceRules?.filter(rule =>
      rule.term.includes('explosive') ||
      rule.term.includes('high-powered') ||
      rule.term.includes('fee avoidance') ||
      rule.term.includes('drop shipping') ||
      rule.term.includes('hate group') ||
      rule.term.includes('off-site payment')
    ) || [];

    // Analyze policy sections
    const sectionsByCategory = policySections?.reduce((acc, section) => {
      acc[section.category] = (acc[section.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Check for AI-processed sections (must have plain_english_summary)
    const aiProcessedSections = policySections?.filter(section => 
      section.plain_english_summary && 
      section.plain_english_summary.length > 20 && 
      !section.plain_english_summary.includes('This section needs')
    ) || [];
    
    // Get sections from expanded policies that may need processing
    const expandedPolicySections = policySections?.filter(section =>
      section.category === 'community_conduct' ||
      section.category === 'prohibited_items' ||
      section.category === 'handmade' ||
      section.category === 'intellectual_property' ||
      section.category === 'fees_and_payments'
    ) || [];
    
    const expandedAiProcessed = expandedPolicySections.filter(section =>
      section.plain_english_summary && 
      section.plain_english_summary.length > 20 && 
      !section.plain_english_summary.includes('This section needs')
    );
    
    const expandedNeedingProcessing = expandedPolicySections.length - expandedAiProcessed.length;

    // Enhanced policies check
    const enhancedPolicies = etsyPolicies?.filter(policy =>
      policy.version === '2024-expansion-updated' ||
      policy.content.includes('HAZARDOUS MATERIALS') ||
      policy.content.includes('PRODUCTION PARTNER') ||
      policy.content.includes('FEE AVOIDANCE')
    ) || [];

    const results = {
      complianceRules: {
        total: complianceRules?.length || 0,
        byRisk: rulesByRisk,
        enhancedCount: enhancedRules.length,
        enhancedSamples: enhancedRules.slice(0, 5).map(r => r.term)
      },
      policySections: {
        total: policySections?.length || 0,
        byCategory: sectionsByCategory,
        aiProcessed: aiProcessedSections.length,
        needingProcessing: (policySections?.length || 0) - aiProcessedSections.length,
        expandedTotal: expandedPolicySections.length,
        expandedAiProcessed: expandedAiProcessed.length,
        expandedNeedingProcessing: expandedNeedingProcessing
      },
      etsyPolicies: {
        total: etsyPolicies?.length || 0,
        enhanced: enhancedPolicies.length,
        enhancedCategories: enhancedPolicies.map(p => p.category)
      }
    };

    console.log('📊 Table Analysis Results:');
    console.log('Compliance Rules:', results.complianceRules);
    console.log('Policy Sections:', results.policySections);
    console.log('Etsy Policies:', results.etsyPolicies);

    return {
      success: true,
      results,
      message: `Found ${results.complianceRules.total} compliance rules, ${results.policySections.total} policy sections (${results.policySections.aiProcessed} AI-processed, ${results.policySections.needingProcessing} pending). Expanded sections: ${results.policySections.expandedAiProcessed}/${results.policySections.expandedTotal} processed`
    };

  } catch (error) {
    console.error('💥 Error checking tables:', error.message);
    return {
      success: false,
      error: error.message,
      message: `Failed to check tables: ${error.message}`
    };
  }
}