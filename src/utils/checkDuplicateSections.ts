// Check for duplicate sections in the policy_sections table
import { supabase } from '@/integrations/supabase/client';

export async function checkDuplicateSections() {
  console.log('🔍 Checking for duplicate sections...');
  
  try {
    // Get all sections with their titles and summaries
    const { data: sections, error } = await supabase
      .from('policy_sections')
      .select('id, section_title, plain_english_summary, category, created_at, policy_id')
      .order('section_title');

    if (error) {
      throw new Error(`Failed to fetch sections: ${error.message}`);
    }

    console.log(`📊 Total sections: ${sections?.length || 0}`);

    // Group sections by normalized title to find duplicates
    const groupedSections = sections?.reduce((acc, section) => {
      // Normalize title for comparison
      const normalizedTitle = section.section_title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ');
      
      if (!acc[normalizedTitle]) {
        acc[normalizedTitle] = [];
      }
      acc[normalizedTitle].push(section);
      return acc;
    }, {} as Record<string, any[]>) || {};

    // Find groups with multiple sections (duplicates)
    const duplicateGroups = Object.entries(groupedSections)
      .filter(([_, sectionGroup]) => sectionGroup.length > 1)
      .map(([normalizedTitle, sectionGroup]) => ({
        normalizedTitle,
        count: sectionGroup.length,
        sections: sectionGroup.map(s => ({
          id: s.id,
          title: s.section_title,
          category: s.category,
          hasAI: !!s.plain_english_summary,
          created: s.created_at,
          policyId: s.policy_id
        }))
      }));

    // Also check for similar content (high similarity)
    const potentialDuplicates = [];
    const titleKeys = Object.keys(groupedSections);
    
    for (let i = 0; i < titleKeys.length; i++) {
      for (let j = i + 1; j < titleKeys.length; j++) {
        const title1 = titleKeys[i];
        const title2 = titleKeys[j];
        
        // Simple similarity check
        const similarity = calculateSimilarity(title1, title2);
        if (similarity > 0.8 && similarity < 1.0) {
          potentialDuplicates.push({
            similarity,
            title1: groupedSections[title1][0].section_title,
            title2: groupedSections[title2][0].section_title,
            sections1: groupedSections[title1],
            sections2: groupedSections[title2]
          });
        }
      }
    }

    // Count processing status
    const processedCount = sections?.filter(s => s.plain_english_summary && s.plain_english_summary.length > 10).length || 0;
    const unprocessedCount = sections?.filter(s => !s.plain_english_summary || s.plain_english_summary.length <= 10).length || 0;

    console.log(`🔄 Processing Status: ${processedCount} processed, ${unprocessedCount} unprocessed`);
    console.log(`🔄 Found ${duplicateGroups.length} exact duplicate groups`);
    console.log(`🔄 Found ${potentialDuplicates.length} potential similar sections`);

    return {
      success: true,
      totalSections: sections?.length || 0,
      processedCount,
      unprocessedCount,
      duplicateGroups: duplicateGroups.slice(0, 10), // Show first 10 duplicate groups
      potentialDuplicates: potentialDuplicates.slice(0, 5), // Show first 5 potential duplicates
      duplicateCount: duplicateGroups.reduce((sum, group) => sum + (group.count - 1), 0), // Extra sections beyond the first
      message: `Found ${duplicateGroups.length} duplicate groups with ${duplicateGroups.reduce((sum, group) => sum + (group.count - 1), 0)} extra duplicate sections`
    };

  } catch (error) {
    console.error('💥 Error checking duplicates:', error.message);
    return {
      success: false,
      error: error.message,
      message: `Failed to check duplicates: ${error.message}`
    };
  }
}

// Helper function for similarity calculation
function calculateSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;
  
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null));
  
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const maxLen = Math.max(len1, len2);
  return (maxLen - matrix[len1][len2]) / maxLen;
}