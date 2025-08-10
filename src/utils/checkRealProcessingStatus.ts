// Check actual processing status by looking at what Edge Functions would process
import { supabase } from '@/integrations/supabase/client';

export async function checkRealProcessingStatus() {
  console.log('🔍 Checking REAL processing status (what Edge Functions see)...');
  
  try {
    // Get all policy sections that might need processing
    const { data: allSections, error } = await supabase
      .from('policy_sections')
      .select('id, section_title, section_content, plain_english_summary, category, risk_level, created_at, policy_id')
      .order('created_at', { ascending: true }); // Oldest first (processing order)

    if (error) {
      throw new Error(`Failed to fetch all sections: ${error.message}`);
    }

    console.log(`📊 Total sections in database: ${allSections?.length || 0}`);

    // Check which ones the Edge Function would consider unprocessed
    // This is the ACTUAL logic the processing function uses
    const unprocessedByEdgeFunction = allSections?.filter(section => {
      // This mimics the Edge Function's logic for what needs processing
      return !section.plain_english_summary || 
             section.plain_english_summary === null ||
             section.plain_english_summary.trim() === '' ||
             section.plain_english_summary === 'null' ||
             section.plain_english_summary.length < 10;
    }) || [];

    // Get sections from expanded categories specifically
    const expandedCategories = ['community_conduct', 'prohibited_items', 'handmade', 'intellectual_property', 'fees_and_payments'];
    const expandedSections = allSections?.filter(section => 
      expandedCategories.includes(section.category)
    ) || [];

    const expandedUnprocessed = expandedSections.filter(section => {
      return !section.plain_english_summary || 
             section.plain_english_summary === null ||
             section.plain_english_summary.trim() === '' ||
             section.plain_english_summary === 'null' ||
             section.plain_english_summary.length < 10;
    });

    // Get very recent sections (last 30 minutes) to see current processing
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const veryRecentProcessed = allSections?.filter(section => 
      section.created_at > thirtyMinutesAgo && 
      section.plain_english_summary && 
      section.plain_english_summary.length > 50
    ) || [];

    console.log(`🎯 Unprocessed sections (Edge Function view): ${unprocessedByEdgeFunction.length}`);
    console.log(`📈 Expanded categories unprocessed: ${expandedUnprocessed.length}`);
    console.log(`⚡ Very recently processed (30min): ${veryRecentProcessed.length}`);

    // Show what would be processed next
    const nextToProcess = unprocessedByEdgeFunction.slice(0, 5);
    if (nextToProcess.length > 0) {
      console.log('🔄 Next sections Edge Function would process:');
      nextToProcess.forEach((section, i) => {
        console.log(`  ${i + 1}. ${section.section_title.substring(0, 60)}... (${section.category})`);
        console.log(`     Summary: "${section.plain_english_summary || 'NULL'}"`);
      });
    }

    return {
      success: true,
      totalSections: allSections?.length || 0,
      unprocessedTotal: unprocessedByEdgeFunction.length,
      expandedTotal: expandedSections.length,
      expandedUnprocessed: expandedUnprocessed.length,
      veryRecentProcessed: veryRecentProcessed.length,
      nextToProcess: nextToProcess.map(s => ({
        title: s.section_title,
        category: s.category,
        summaryStatus: s.plain_english_summary ? 'HAS_SUMMARY' : 'NO_SUMMARY',
        summaryLength: s.plain_english_summary?.length || 0,
        created: s.created_at
      })),
      message: `REAL STATUS: ${unprocessedByEdgeFunction.length} total unprocessed, ${expandedUnprocessed.length} in expanded categories`
    };

  } catch (error) {
    console.error('💥 Error checking real processing status:', error.message);
    return {
      success: false,
      error: error.message,
      message: `Failed to check real status: ${error.message}`
    };
  }
}