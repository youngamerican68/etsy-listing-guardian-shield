// Utility to insert new policy categories into Supabase
// Run this from your React app's admin interface

import { supabase } from '@/integrations/supabase/client';
import policiesData from '../../policies.json';

export async function insertNewPolicies() {
  console.log('🚀 Starting new policy insertion...');
  
  try {
    // Get existing policies to avoid duplicates
    const { data: existingPolicies, error: fetchError } = await supabase
      .from('etsy_policies')
      .select('category');
    
    if (fetchError) {
      throw new Error(`Failed to fetch existing policies: ${fetchError.message}`);
    }
    
    const existingCategories = new Set(existingPolicies?.map(p => p.category) || []);
    console.log('📊 Existing categories:', Array.from(existingCategories));
    
    // Filter for new policies only - focus on the expanded ones
    const newPolicies = policiesData.filter(policy => 
      !existingCategories.has(policy.category) && 
      policy.category.includes('_expanded')
    );
    
    console.log(`🔍 Found ${newPolicies.length} new detailed policies to insert:`);
    newPolicies.forEach(p => console.log(`  - ${p.category}`));
    
    if (newPolicies.length === 0) {
      console.log('✅ No new policies to insert. All policies already exist.');
      return { success: true, inserted: 0, message: 'No new policies to insert' };
    }
    
    // Insert new policies with all required fields
    const { data: insertedPolicies, error: insertError } = await supabase
      .from('etsy_policies')
      .insert(newPolicies.map(policy => ({
        category: policy.category,
        content: policy.content,
        title: policy.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        url: policy.url, // From policies.json
        is_active: true,
        scraped_at: new Date().toISOString(),
        version: '2024-expansion'
      })))
      .select();
    
    if (insertError) {
      throw new Error(`Failed to insert new policies: ${insertError.message}`);
    }
    
    console.log('✅ Successfully inserted new policies:');
    insertedPolicies?.forEach(policy => {
      console.log(`  - ${policy.category} (ID: ${policy.id})`);
    });
    
    console.log(`🎉 Policy insertion complete! Added ${insertedPolicies?.length || 0} new policies.`);
    console.log('🔄 Next step: AI processing will automatically begin for new policy sections.');
    
    return { 
      success: true, 
      inserted: insertedPolicies?.length || 0, 
      policies: insertedPolicies,
      message: `Successfully inserted ${insertedPolicies?.length || 0} new policies`
    };
    
  } catch (error) {
    console.error('💥 Error inserting policies:', error.message);
    return { 
      success: false, 
      inserted: 0, 
      error: error.message,
      message: `Failed to insert policies: ${error.message}`
    };
  }
}

export async function triggerPolicyProcessing() {
  console.log('🤖 Triggering AI processing of new policy sections...');
  
  try {
    // Call your existing Edge Function to start AI processing
    const response = await fetch('https://youjypiuqxlvyizlszmd.supabase.co/functions/v1/process-single-section', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdWp5cGl1cXhsdnlpemxzem1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExNjE2NjQsImV4cCI6MjA2NjczNzY2NH0.Z2pTJ_bPOEm8578lBx8qMzsA1pyNBpuuvb4jmibDPcA`
      },
      body: JSON.stringify({})
    });
    
    if (!response.ok) {
      throw new Error(`Processing trigger failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('🎉 AI processing triggered successfully:', result);
    
    return { success: true, result };
    
  } catch (error) {
    console.error('💥 Error triggering processing:', error.message);
    return { success: false, error: error.message };
  }
}