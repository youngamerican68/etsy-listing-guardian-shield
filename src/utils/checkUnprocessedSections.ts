// Check for sections that haven't been AI processed yet
import { supabase } from '@/integrations/supabase/client';

export async function checkUnprocessedSections() {
  console.log('🔍 Checking for unprocessed sections...');
  
  try {
    // Get all sections from expanded policies that might need processing
    const { data: sections, error } = await supabase
      .from('policy_sections')
      .select('section_title, section_content, plain_english_summary, category, risk_level, created_at, policy_id')
      .in('category', ['community_conduct', 'prohibited_items', 'handmade', 'intellectual_property', 'fees_and_payments'])
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch sections: ${error.message}`);
    }

    console.log(`📊 Found ${sections?.length || 0} sections from expanded policies`);

    // Check which ones are actually unprocessed (no summary or very short summary)
    const unprocessed = sections?.filter(section => {
      // Check if summary is missing, too short, or placeholder text
      const summary = section.plain_english_summary;
      return !summary || 
             summary.length < 20 || 
             summary.includes('needs processing') ||
             summary.includes('placeholder') ||
             summary.includes('TODO') ||
             summary.trim() === '' ||
             summary === 'null';
    }) || [];

    // Get recently processed sections (last 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const recentlyProcessed = sections?.filter(section => 
      section.created_at > twoHoursAgo && 
      section.plain_english_summary && 
      section.plain_english_summary.length > 50
    ) || [];

    console.log(`🔄 ${unprocessed.length} unprocessed sections found`);
    console.log(`✅ ${recentlyProcessed.length} recently processed sections`);

    if (unprocessed.length > 0) {
      console.log('📝 Next sections to process:');
      unprocessed.slice(0, 3).forEach((section, i) => {
        console.log(`  ${i + 1}. ${section.section_title} (${section.category})`);
      });
    }

    return {
      success: true,
      totalExpanded: sections?.length || 0,
      unprocessed: unprocessed.length,
      processed: (sections?.length || 0) - unprocessed.length,
      recentlyProcessed: recentlyProcessed.length,
      nextToProcess: unprocessed.slice(0, 5).map(s => ({
        title: s.section_title,
        category: s.category,
        created: s.created_at
      })),
      message: `Found ${unprocessed.length} unprocessed sections out of ${sections?.length || 0} total expanded sections`
    };

  } catch (error) {
    console.error('💥 Error checking unprocessed sections:', error.message);
    return {
      success: false,
      error: error.message,
      message: `Failed to check unprocessed sections: ${error.message}`
    };
  }
}