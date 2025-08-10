// Mimic exactly what the Edge Function looks for when processing sections
import { supabase } from '@/integrations/supabase/client';

export async function mimicEdgeFunction() {
  console.log('🤖 Mimicking Edge Function processing logic...');
  
  try {
    // Get sections exactly like the Edge Function does
    const { data: sections, error } = await supabase
      .from('policy_sections')
      .select('id, section_title, section_content, plain_english_summary, category, created_at')
      .is('plain_english_summary', null) // This is likely what Edge Function checks
      .order('created_at', { ascending: true })
      .limit(10); // Show next 10 that would be processed

    if (error) {
      throw new Error(`Failed to fetch sections: ${error.message}`);
    }

    console.log(`🎯 Found ${sections?.length || 0} sections with NULL summaries`);

    // Also check for empty string summaries
    const { data: emptySections, error: emptyError } = await supabase
      .from('policy_sections')
      .select('id, section_title, section_content, plain_english_summary, category, created_at')
      .eq('plain_english_summary', '')
      .order('created_at', { ascending: true })
      .limit(5);

    if (emptyError) {
      throw new Error(`Failed to fetch empty sections: ${emptyError.message}`);
    }

    // Also check for very short summaries that might need reprocessing
    const { data: shortSections, error: shortError } = await supabase
      .from('policy_sections')
      .select('id, section_title, section_content, plain_english_summary, category, created_at')
      .not('plain_english_summary', 'is', null)
      .order('created_at', { ascending: true });

    if (shortError) {
      throw new Error(`Failed to fetch short sections: ${shortError.message}`);
    }

    const veryShortSections = shortSections?.filter(s => 
      s.plain_english_summary && s.plain_english_summary.length < 10
    ).slice(0, 5) || [];

    const allUnprocessed = [
      ...(sections || []).map(s => ({ ...s, reason: 'NULL summary' })),
      ...(emptySections || []).map(s => ({ ...s, reason: 'Empty summary' })),
      ...veryShortSections.map(s => ({ ...s, reason: `Very short summary (${s.plain_english_summary?.length} chars)` }))
    ];

    console.log('🔍 Next sections Edge Function would process:');
    allUnprocessed.slice(0, 5).forEach((section, i) => {
      console.log(`  ${i + 1}. "${section.section_title}" (${section.category}) - ${section.reason}`);
    });

    return {
      success: true,
      totalUnprocessed: allUnprocessed.length,
      nullSummaries: sections?.length || 0,
      emptySummaries: emptySections?.length || 0,
      shortSummaries: veryShortSections.length,
      nextToProcess: allUnprocessed.slice(0, 10).map(s => ({
        id: s.id,
        title: s.section_title,
        category: s.category,
        reason: s.reason,
        currentSummary: s.plain_english_summary || 'NULL',
        created: s.created_at
      })),
      message: `Edge Function would process ${allUnprocessed.length} sections (${sections?.length || 0} null, ${emptySections?.length || 0} empty, ${veryShortSections.length} short summaries)`
    };

  } catch (error) {
    console.error('💥 Error mimicking Edge Function:', error.message);
    return {
      success: false,
      error: error.message,
      message: `Failed to mimic Edge Function: ${error.message}`
    };
  }
}