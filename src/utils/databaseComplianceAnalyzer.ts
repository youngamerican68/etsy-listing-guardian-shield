
import { supabase } from '@/integrations/supabase/client';

export interface DatabaseComplianceResult {
  status: 'pass' | 'warning' | 'fail';
  flaggedTerms: string[];
  suggestions: string[];
  confidence: number;
  ruleMatches: Array<{
    term: string;
    risk_level: 'high' | 'warning';
    reason: string;
  }>;
}

// Simple hash function for browser compatibility
const generateContentHash = async (title: string, description: string): Promise<string> => {
  const content = `${title.trim().toLowerCase()}|${description.trim().toLowerCase()}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const analyzeDatabaseCompliance = async (
  title: string, 
  description: string
): Promise<DatabaseComplianceResult> => {
  const contentHash = await generateContentHash(title, description);
  
  try {
    // First, check cache for existing result
    const { data: cachedResult, error: cacheError } = await supabase
      .from('compliance_cache')
      .select('*')
      .eq('content_hash', contentHash)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cachedResult && !cacheError) {
      console.log('Cache hit for compliance analysis');
      
      // Update hit count
      await supabase
        .from('compliance_cache')
        .update({ hit_count: cachedResult.hit_count + 1 })
        .eq('id', cachedResult.id);

      return {
        status: cachedResult.status as 'pass' | 'warning' | 'fail',
        flaggedTerms: cachedResult.flagged_terms || [],
        suggestions: cachedResult.suggestions || [],
        confidence: Number(cachedResult.confidence),
        ruleMatches: Array.isArray(cachedResult.rule_matches) ? cachedResult.rule_matches as Array<{
          term: string;
          risk_level: 'high' | 'warning';
          reason: string;
        }> : []
      };
    }

    console.log('Cache miss - performing fresh analysis');
    
    // Perform fresh analysis
    const fullText = `${title} ${description}`.toLowerCase();
    
    // Fetch all active compliance rules
    const { data: rules, error } = await supabase
      .from('compliance_rules')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching compliance rules:', error);
      // Fallback to basic analysis if database fails
      return {
        status: 'pass',
        flaggedTerms: [],
        suggestions: [],
        confidence: 0.5,
        ruleMatches: []
      };
    }

    const ruleMatches: Array<{
      term: string;
      risk_level: 'high' | 'warning';
      reason: string;
    }> = [];

    // Scan text for each rule
    rules?.forEach(rule => {
      if (fullText.includes(rule.term)) {
        ruleMatches.push({
          term: rule.term,
          risk_level: rule.risk_level as 'high' | 'warning',
          reason: rule.reason
        });
      }
    });

    // Determine overall status based on highest risk level found
    let status: 'pass' | 'warning' | 'fail' = 'pass';
    let confidence = 0.95;

    if (ruleMatches.length > 0) {
      const hasHighRisk = ruleMatches.some(match => match.risk_level === 'high');
      status = hasHighRisk ? 'fail' : 'warning';
      confidence = hasHighRisk ? 0.85 : 0.75;
    }

    // Extract flagged terms and suggestions
    const flaggedTerms = ruleMatches.map(match => match.term);
    const suggestions = ruleMatches.map(match => `${match.reason}: Remove or replace "${match.term}"`);

    const result: DatabaseComplianceResult = {
      status,
      flaggedTerms,
      suggestions,
      confidence,
      ruleMatches
    };

    // Cache the result for future use
    try {
      await supabase
        .from('compliance_cache')
        .insert({
          content_hash: contentHash,
          title: title.trim(),
          description: description.trim(),
          status: result.status,
          flagged_terms: result.flaggedTerms,
          suggestions: result.suggestions,
          confidence: result.confidence,
          rule_matches: result.ruleMatches
        });
    } catch (cacheInsertError) {
      console.warn('Failed to cache result:', cacheInsertError);
      // Don't fail the entire analysis if caching fails
    }

    return result;
  } catch (error) {
    console.error('Database compliance analysis failed:', error);
    // Return safe fallback
    return {
      status: 'warning',
      flaggedTerms: [],
      suggestions: ['Unable to complete compliance check. Please try again.'],
      confidence: 0.1,
      ruleMatches: []
    };
  }
};
