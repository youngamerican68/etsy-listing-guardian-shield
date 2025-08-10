// Update existing policy content instead of adding new categories
// This approach avoids the database constraint issues

import { supabase } from '@/integrations/supabase/client';
import policiesData from '../../policies.json';

export async function updateExistingPolicies() {
  console.log('🚀 Updating existing policies with expanded content...');
  
  try {
    // Get existing policies
    const { data: existingPolicies, error: fetchError } = await supabase
      .from('etsy_policies')
      .select('*');
    
    if (fetchError) {
      throw new Error(`Failed to fetch existing policies: ${fetchError.message}`);
    }
    
    console.log('📊 Found existing policies:', existingPolicies?.length);
    
    // Map the expanded content to existing categories
    const expansionMapping = {
      'prohibited_items': 'prohibited_items_expanded',
      'handmade': 'handmade_expanded', 
      'intellectual_property': 'intellectual_property_expanded',
      'fees_and_payments': 'fees_payments_expanded',
      'community': 'community_conduct_expanded'
    };
    
    let updatedCount = 0;
    const updates = [];
    
    // Find matching expanded content for existing categories
    for (const existingPolicy of existingPolicies || []) {
      const expandedCategory = expansionMapping[existingPolicy.category as keyof typeof expansionMapping];
      const expandedPolicy = policiesData.find(p => p.category === expandedCategory);
      
      if (expandedPolicy) {
        console.log(`🔄 Updating ${existingPolicy.category} with expanded content`);
        
        // Update the existing policy with expanded content
        const { error: updateError } = await supabase
          .from('etsy_policies')
          .update({
            content: expandedPolicy.content,
            last_updated: new Date().toISOString(),
            version: '2024-expansion-updated'
          })
          .eq('id', existingPolicy.id);
        
        if (updateError) {
          console.error(`❌ Failed to update ${existingPolicy.category}:`, updateError.message);
          continue;
        }
        
        updatedCount++;
        updates.push({
          category: existingPolicy.category,
          title: existingPolicy.title,
          expanded: true
        });
      }
    }
    
    if (updatedCount === 0) {
      return { 
        success: true, 
        updated: 0, 
        message: 'No existing policies needed updating' 
      };
    }
    
    console.log(`✅ Successfully updated ${updatedCount} existing policies with expanded content`);
    
    return { 
      success: true, 
      updated: updatedCount, 
      updates,
      message: `Successfully updated ${updatedCount} existing policies with comprehensive expanded content`
    };
    
  } catch (error) {
    console.error('💥 Error updating policies:', error.message);
    return { 
      success: false, 
      updated: 0, 
      error: error.message,
      message: `Failed to update policies: ${error.message}`
    };
  }
}