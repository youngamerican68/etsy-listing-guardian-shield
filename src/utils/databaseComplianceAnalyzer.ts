
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

export const analyzeDatabaseCompliance = async (
  title: string, 
  description: string
): Promise<DatabaseComplianceResult> => {
  const fullText = `${title} ${description}`.toLowerCase();
  
  try {
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

    return {
      status,
      flaggedTerms,
      suggestions,
      confidence,
      ruleMatches
    };
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
