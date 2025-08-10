// Check existing categories to understand the constraint
import { supabase } from '@/integrations/supabase/client';

export async function checkExistingCategories() {
  console.log('🔍 Checking existing policy categories...');
  
  try {
    const { data: existingPolicies, error } = await supabase
      .from('etsy_policies')
      .select('category, title')
      .order('category');
    
    if (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }
    
    console.log('📊 Existing categories in database:');
    existingPolicies?.forEach(policy => {
      console.log(`  - ${policy.category} (${policy.title})`);
    });
    
    return { 
      success: true, 
      categories: existingPolicies?.map(p => p.category) || [],
      data: existingPolicies
    };
    
  } catch (error) {
    console.error('💥 Error checking categories:', error.message);
    return { 
      success: false, 
      error: error.message 
    };
  }
}