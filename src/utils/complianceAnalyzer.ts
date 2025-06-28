
export interface ComplianceAnalysisResult {
  status: 'pass' | 'warning' | 'fail';
  flaggedTerms: string[];
  suggestions: string[];
  confidence: number;
}

export const analyzeTextCompliance = async (
  title: string, 
  description: string
): Promise<ComplianceAnalysisResult> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const fullText = `${title} ${description}`.toLowerCase();
  const flaggedTerms: string[] = [];
  const suggestions: string[] = [];
  
  // Basic trademark detection
  const trademarkTerms = [
    'disney', 'marvel', 'nike', 'apple', 'pokemon', 'nintendo',
    'harry potter', 'star wars', 'batman', 'superman'
  ];
  
  trademarkTerms.forEach(term => {
    if (fullText.includes(term)) {
      flaggedTerms.push(term);
      suggestions.push(`Remove "${term}" and use generic descriptions instead`);
    }
  });
  
  // Handmade policy violations
  const massProductionTerms = ['factory made', 'mass produced', 'wholesale'];
  massProductionTerms.forEach(term => {
    if (fullText.includes(term)) {
      flaggedTerms.push(term);
      suggestions.push('Remove mass production references for handmade category');
    }
  });
  
  // Determine status
  let status: 'pass' | 'warning' | 'fail' = 'pass';
  let confidence = 0.95;
  
  if (flaggedTerms.length > 0) {
    const hasHighRiskTerms = trademarkTerms.some(term => fullText.includes(term));
    status = hasHighRiskTerms ? 'fail' : 'warning';
    confidence = hasHighRiskTerms ? 0.85 : 0.75;
  }
  
  return {
    status,
    flaggedTerms,
    suggestions,
    confidence
  };
};
