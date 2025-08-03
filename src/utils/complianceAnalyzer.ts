
import { openRouterAnalyzer, type OpenRouterComplianceResult } from '@/services/openRouterAnalyzer';

export interface ComplianceAnalysisResult {
  status: 'pass' | 'warning' | 'fail';
  flaggedTerms: string[];
  suggestions: string[];
  confidence: number;
  reasoning?: string;
  modelUsed?: string;
}

export const analyzeTextCompliance = async (
  title: string, 
  description: string
): Promise<ComplianceAnalysisResult> => {
  try {
    console.log('🤖 Starting AI-powered compliance analysis...');
    
    // Use OpenRouter for intelligent analysis
    const result = await openRouterAnalyzer.analyzeCompliance(title, description);
    
    return {
      status: result.status,
      flaggedTerms: result.flaggedTerms,
      suggestions: result.suggestions,
      confidence: result.confidence,
      reasoning: result.reasoning,
      modelUsed: result.modelUsed
    };
    
  } catch (error) {
    console.error('AI analysis failed, falling back to basic analysis:', error);
    
    // Fallback to basic hardcoded analysis if AI fails
    const fullText = `${title} ${description}`.toLowerCase();
    const flaggedTerms: string[] = [];
    const suggestions: string[] = [];
    
    // Basic trademark detection (expanded list)
    const trademarkTerms = [
      'disney', 'marvel', 'nike', 'apple', 'pokemon', 'nintendo',
      'harry potter', 'star wars', 'batman', 'superman', 'heinz',
      'coca-cola', 'pepsi', 'mcdonalds', 'starbucks', 'gucci', 'louis vuitton',
      // Star Wars characters
      'chewbacca', 'han solo', 'luke skywalker', 'princess leia', 'darth vader',
      'obi-wan', 'yoda', 'c-3po', 'r2-d2', 'boba fett', 'jedi', 'sith',
      // Pokemon characters  
      'pikachu', 'charizard', 'bulbasaur', 'squirtle', 'mewtwo', 'eevee',
      'lucario', 'garchomp', 'rayquaza', 'arceus', 'pokeball',
      // Marvel characters
      'spiderman', 'spider-man', 'iron man', 'captain america', 'hulk', 'thor',
      'black widow', 'hawkeye', 'deadpool', 'wolverine', 'x-men',
      // DC characters
      'wonder woman', 'flash', 'green lantern', 'aquaman', 'joker', 'harley quinn',
      // Disney characters
      'mickey mouse', 'minnie mouse', 'donald duck', 'goofy', 'pluto', 'frozen',
      'elsa', 'anna', 'olaf', 'moana', 'simba', 'nemo', 'buzz lightyear', 'woody'
    ];
    
    trademarkTerms.forEach(term => {
      if (fullText.includes(term)) {
        flaggedTerms.push(term);
        suggestions.push(`Remove "${term}" - it's a protected trademark`);
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
    let confidence = 0.7; // Lower confidence for fallback
    
    if (flaggedTerms.length > 0) {
      const hasHighRiskTerms = trademarkTerms.some(term => fullText.includes(term));
      status = hasHighRiskTerms ? 'fail' : 'warning';
      confidence = hasHighRiskTerms ? 0.75 : 0.65;
    }
    
    return {
      status,
      flaggedTerms,
      suggestions,
      confidence,
      reasoning: 'Fallback analysis (AI unavailable)',
      modelUsed: 'fallback'
    };
  }
};
