// Verify that the policy updates were actually applied
import { supabase } from '@/integrations/supabase/client';

export async function verifyPolicyUpdates() {
  console.log('🔍 Verifying policy updates...');
  
  try {
    const { data: policies, error } = await supabase
      .from('etsy_policies')
      .select('category, title, content, last_updated, version')
      .order('category');
    
    if (error) {
      throw new Error(`Failed to fetch policies: ${error.message}`);
    }
    
    const verification = {
      totalPolicies: policies?.length || 0,
      updatedPolicies: 0,
      enhancedContent: [] as any[],
      summary: {} as any
    };
    
    // Check each policy for enhanced content indicators
    policies?.forEach(policy => {
      const hasEnhancedContent = 
        policy.content.includes('HAZARDOUS MATERIALS') ||
        policy.content.includes('PRODUCTION PARTNER') ||
        policy.content.includes('COPYRIGHT PROTECTION') ||
        policy.content.includes('FEE AVOIDANCE') ||
        policy.content.includes('ZERO TOLERANCE');
      
      const isUpdated = policy.version === '2024-expansion-updated';
      
      if (hasEnhancedContent || isUpdated) {
        verification.updatedPolicies++;
        verification.enhancedContent.push({
          category: policy.category,
          title: policy.title,
          hasEnhancedContent,
          isUpdated,
          contentLength: policy.content.length,
          lastUpdated: policy.last_updated,
          version: policy.version,
          keyIndicators: [
            policy.content.includes('HAZARDOUS MATERIALS') ? 'Enhanced Prohibited Items' : null,
            policy.content.includes('PRODUCTION PARTNER') ? 'Production Partner Rules' : null,
            policy.content.includes('COPYRIGHT PROTECTION') ? 'IP Distinctions' : null,
            policy.content.includes('FEE AVOIDANCE') ? 'Fee Avoidance Policy' : null,
            policy.content.includes('ZERO TOLERANCE') ? 'Community Standards' : null
          ].filter(Boolean)
        });
      }
      
      // Summary by category
      verification.summary[policy.category] = {
        contentLength: policy.content.length,
        enhanced: hasEnhancedContent,
        updated: isUpdated,
        lastUpdated: policy.last_updated
      };
    });
    
    console.log('📊 Verification Results:');
    console.log(`  - Total Policies: ${verification.totalPolicies}`);
    console.log(`  - Enhanced Policies: ${verification.updatedPolicies}`);
    
    verification.enhancedContent.forEach(policy => {
      console.log(`  - ${policy.category}: ${policy.keyIndicators.join(', ')}`);
    });
    
    return {
      success: true,
      verification,
      message: `Verified: ${verification.updatedPolicies}/${verification.totalPolicies} policies have been enhanced with comprehensive content`
    };
    
  } catch (error) {
    console.error('💥 Error verifying updates:', error.message);
    return {
      success: false,
      error: error.message,
      message: `Verification failed: ${error.message}`
    };
  }
}