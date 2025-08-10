// Check if a specific section was processed and added to the database
import { supabase } from '@/integrations/supabase/client';

export async function checkSpecificSection(searchTerm: string = "hate groups") {
  console.log(`🔍 Checking for section containing: "${searchTerm}"`);
  
  try {
    const { data: sections, error } = await supabase
      .from('policy_sections')
      .select('section_title, section_content, plain_english_summary, category, risk_level, created_at')
      .or(`section_title.ilike.%${searchTerm}%,section_content.ilike.%${searchTerm}%,plain_english_summary.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to search sections: ${error.message}`);
    }

    console.log(`📊 Found ${sections?.length || 0} sections containing "${searchTerm}"`);

    // Check for the most recent one (should be the one just processed)
    const recentSection = sections?.[0];
    
    if (recentSection) {
      console.log('📝 Most Recent Section:');
      console.log(`  Title: ${recentSection.section_title}`);
      console.log(`  Category: ${recentSection.category}`);
      console.log(`  Risk Level: ${recentSection.risk_level}`);
      console.log(`  Created: ${recentSection.created_at}`);
      console.log(`  Summary: ${recentSection.plain_english_summary?.substring(0, 100)}...`);
    }

    return {
      success: true,
      found: sections?.length || 0,
      recentSection,
      message: `Found ${sections?.length || 0} sections containing "${searchTerm}"`
    };

  } catch (error) {
    console.error('💥 Error checking section:', error.message);
    return {
      success: false,
      error: error.message,
      message: `Failed to check section: ${error.message}`
    };
  }
}