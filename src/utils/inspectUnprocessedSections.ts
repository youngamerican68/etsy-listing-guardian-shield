// Inspect the specific sections that aren't being marked as processed
import { supabase } from '@/integrations/supabase/client';

export async function inspectUnprocessedSections() {
  console.log('🔍 Inspecting problematic sections...');
  
  try {
    // Get all sections from expanded policies
    const { data: sections, error } = await supabase
      .from('policy_sections')
      .select('section_title, section_content, plain_english_summary, category, risk_level, created_at, policy_id')
      .in('category', ['community_conduct', 'prohibited_items', 'handmade', 'intellectual_property', 'fees_and_payments'])
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch sections: ${error.message}`);
    }

    // Check which ones are unprocessed
    const unprocessed = sections?.filter(section => {
      const summary = section.plain_english_summary;
      const isUnprocessed = !summary || 
                           summary.length < 20 || 
                           summary.includes('needs processing') ||
                           summary.includes('placeholder') ||
                           summary.includes('TODO') ||
                           summary.trim() === '' ||
                           summary === 'null';
      
      if (isUnprocessed) {
        console.log(`❌ UNPROCESSED: "${section.section_title}"`);
        console.log(`   Summary length: ${summary?.length || 0}`);
        console.log(`   Summary: "${summary?.substring(0, 100) || 'NULL'}"`);
        console.log(`   Category: ${section.category}`);
        console.log(`   Created: ${section.created_at}`);
        console.log('---');
      }
      
      return isUnprocessed;
    }) || [];

    // Also show recent ones that ARE processed for comparison
    const processed = sections?.filter(section => {
      const summary = section.plain_english_summary;
      return summary && summary.length > 20 && !summary.includes('needs processing');
    }) || [];

    console.log(`✅ Found ${processed.length} properly processed sections`);
    console.log(`❌ Found ${unprocessed.length} unprocessed sections`);

    return {
      success: true,
      totalSections: sections?.length || 0,
      processed: processed.length,
      unprocessed: unprocessed.length,
      unprocessedDetails: unprocessed.map(section => ({
        title: section.section_title,
        category: section.category,
        summaryLength: section.plain_english_summary?.length || 0,
        summary: section.plain_english_summary?.substring(0, 200) || 'NO SUMMARY',
        created: section.created_at,
        content: section.section_content?.substring(0, 200) || 'NO CONTENT'
      })),
      message: `Detailed inspection: ${processed.length} processed, ${unprocessed.length} unprocessed`
    };

  } catch (error) {
    console.error('💥 Error inspecting sections:', error.message);
    return {
      success: false,
      error: error.message,
      message: `Failed to inspect sections: ${error.message}`
    };
  }
}