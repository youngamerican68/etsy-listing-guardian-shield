// Find what category names actually exist in the database
import { supabase } from '@/integrations/supabase/client';

export async function findActualCategories() {
  console.log('🔍 Finding actual category names in database...');
  
  try {
    // Get all unique categories in the database
    const { data: sections, error } = await supabase
      .from('policy_sections')
      .select('category, section_title, plain_english_summary, created_at')
      .order('category');

    if (error) {
      throw new Error(`Failed to fetch sections: ${error.message}`);
    }

    console.log(`📊 Total sections found: ${sections?.length || 0}`);

    // Get unique categories and count sections
    const categoryStats = sections?.reduce((acc, section) => {
      if (!acc[section.category]) {
        acc[section.category] = {
          total: 0,
          processed: 0,
          unprocessed: 0,
          samples: []
        };
      }
      
      acc[section.category].total++;
      
      const hasProcessing = section.plain_english_summary && section.plain_english_summary.length > 20;
      if (hasProcessing) {
        acc[section.category].processed++;
      } else {
        acc[section.category].unprocessed++;
      }
      
      // Keep sample titles
      if (acc[section.category].samples.length < 3) {
        acc[section.category].samples.push({
          title: section.section_title,
          hasProcessing,
          created: section.created_at
        });
      }
      
      return acc;
    }, {} as Record<string, any>) || {};

    console.log('📈 Categories found:');
    Object.keys(categoryStats).forEach(category => {
      const stats = categoryStats[category];
      console.log(`  ${category}: ${stats.processed}/${stats.total} processed (${stats.unprocessed} remaining)`);
      stats.samples.forEach((sample: any, i: number) => {
        console.log(`    ${i + 1}. ${sample.title} - ${sample.hasProcessing ? 'PROCESSED' : 'UNPROCESSED'}`);
      });
    });

    // Calculate totals
    const totalSections = Object.values(categoryStats).reduce((sum: number, cat: any) => sum + cat.total, 0);
    const totalProcessed = Object.values(categoryStats).reduce((sum: number, cat: any) => sum + cat.processed, 0);
    const totalUnprocessed = Object.values(categoryStats).reduce((sum: number, cat: any) => sum + cat.unprocessed, 0);

    return {
      success: true,
      totalSections,
      totalProcessed,
      totalUnprocessed,
      categories: Object.keys(categoryStats).map(category => ({
        name: category,
        total: categoryStats[category].total,
        processed: categoryStats[category].processed,
        unprocessed: categoryStats[category].unprocessed,
        samples: categoryStats[category].samples
      })),
      message: `Found ${Object.keys(categoryStats).length} categories with ${totalUnprocessed} unprocessed sections total`
    };

  } catch (error) {
    console.error('💥 Error finding categories:', error.message);
    return {
      success: false,
      error: error.message,
      message: `Failed to find categories: ${error.message}`
    };
  }
}