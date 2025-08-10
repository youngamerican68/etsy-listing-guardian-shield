// Comprehensive audit of policy sections in Supabase to determine exact processing status
import { supabase } from '@/integrations/supabase/client';

export async function auditPolicySections() {
  console.log('🔍 Comprehensive audit of policy sections...');
  
  try {
    // Get ALL policy sections in the database
    const { data: allSections, error } = await supabase
      .from('policy_sections')
      .select('id, section_title, section_content, plain_english_summary, category, risk_level, created_at, policy_id')
      .order('category', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch sections: ${error.message}`);
    }

    console.log(`📊 Total sections in database: ${allSections?.length || 0}`);

    // Group by category
    const byCategory = allSections?.reduce((acc, section) => {
      if (!acc[section.category]) {
        acc[section.category] = [];
      }
      acc[section.category].push({
        title: section.section_title,
        hasProcessing: !!(section.plain_english_summary && section.plain_english_summary.length > 20),
        summaryLength: section.plain_english_summary?.length || 0,
        created: section.created_at,
        id: section.id
      });
      return acc;
    }, {} as Record<string, any[]>) || {};

    // Focus on expanded categories
    const expandedCategories = [
      'prohibited_items_expanded', 
      'handmade_expanded', 
      'intellectual_property_expanded', 
      'fees_payments_expanded', 
      'community_conduct_expanded'
    ];

    const expandedAnalysis = expandedCategories.map(category => {
      const sections = byCategory[category] || [];
      const processed = sections.filter(s => s.hasProcessing);
      const unprocessed = sections.filter(s => !s.hasProcessing);
      
      return {
        category,
        total: sections.length,
        processed: processed.length,
        unprocessed: unprocessed.length,
        unprocessedTitles: unprocessed.map(s => s.title.substring(0, 50) + '...')
      };
    });

    // Get total counts
    const totalExpanded = expandedAnalysis.reduce((sum, cat) => sum + cat.total, 0);
    const totalProcessed = expandedAnalysis.reduce((sum, cat) => sum + cat.processed, 0);
    const totalUnprocessed = expandedAnalysis.reduce((sum, cat) => sum + cat.unprocessed, 0);

    console.log('📈 Expanded Categories Analysis:');
    expandedAnalysis.forEach(cat => {
      console.log(`  ${cat.category}: ${cat.processed}/${cat.total} processed (${cat.unprocessed} remaining)`);
      if (cat.unprocessedTitles.length > 0) {
        console.log(`    Unprocessed: ${cat.unprocessedTitles.join(', ')}`);
      }
    });

    return {
      success: true,
      totalSections: allSections?.length || 0,
      byCategory: Object.keys(byCategory).map(category => ({
        category,
        total: byCategory[category].length,
        processed: byCategory[category].filter((s: any) => s.hasProcessing).length,
        unprocessed: byCategory[category].filter((s: any) => !s.hasProcessing).length
      })),
      expandedAnalysis,
      expandedTotals: {
        total: totalExpanded,
        processed: totalProcessed,
        unprocessed: totalUnprocessed
      },
      message: `Found ${totalUnprocessed} unprocessed sections out of ${totalExpanded} total expanded sections`
    };

  } catch (error) {
    console.error('💥 Error auditing policy sections:', error.message);
    return {
      success: false,
      error: error.message,
      message: `Failed to audit sections: ${error.message}`
    };
  }
}