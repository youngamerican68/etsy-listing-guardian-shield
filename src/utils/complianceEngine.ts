
export interface ComplianceResult {
  status: 'pass' | 'warning' | 'fail';
  flaggedTerms: string[];
  suggestions: string[];
  violations: PolicyViolation[];
}

export interface PolicyViolation {
  category: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  suggestion: string;
}

class EtsyComplianceEngine {
  // Handmade Policy Violations
  private detectHandmadeViolations(text: string): PolicyViolation[] {
    const violations: PolicyViolation[] = [];
    const lowerText = text.toLowerCase();
    
    // Mass production indicators
    const massProductionTerms = [
      'factory made', 'mass produced', 'wholesale', 'bulk order',
      'manufactured in china', 'factory direct', 'imported from',
      'drop shipped', 'dropship', 'reseller'
    ];
    
    massProductionTerms.forEach(term => {
      if (lowerText.includes(term)) {
        violations.push({
          category: 'Handmade Verification',
          severity: 'high',
          description: `Contains mass production indicator: "${term}"`,
          suggestion: 'Remove mass production references. Describe your personal crafting process instead.'
        });
      }
    });
    
    // Questionable handmade claims
    const questionableTerms = [
      'handmade in factory', 'machine handmade', 'handmade by machine',
      'assembly line handmade', 'batch produced handmade'
    ];
    
    questionableTerms.forEach(term => {
      if (lowerText.includes(term)) {
        violations.push({
          category: 'Handmade Verification',
          severity: 'high',
          description: `Contradictory handmade claim: "${term}"`,
          suggestion: 'Clarify your actual role in creating the item. Be specific about which parts you personally make.'
        });
      }
    });
    
    return violations;
  }
  
  // Production Partner Disclosure
  private detectProductionPartnerViolations(text: string): PolicyViolation[] {
    const violations: PolicyViolation[] = [];
    const lowerText = text.toLowerCase();
    
    // Indicators of undisclosed partners
    const partnerIndicators = [
      'made by artisan', 'crafted by local', 'created by skilled',
      'handmade by craftsman', 'made by family business'
    ];
    
    partnerIndicators.forEach(term => {
      if (lowerText.includes(term)) {
        violations.push({
          category: 'Production Partner Disclosure',
          severity: 'medium',
          description: `Potential undisclosed production partner: "${term}"`,
          suggestion: 'If others help create your items, disclose this in your listing and shop policies per Etsy requirements.'
        });
      }
    });
    
    return violations;
  }
  
  // Vintage Age Validation
  private detectVintageViolations(text: string): PolicyViolation[] {
    const violations: PolicyViolation[] = [];
    const lowerText = text.toLowerCase();
    
    // Check for vintage claims
    if (lowerText.includes('vintage')) {
      // Look for specific age claims
      const agePattern = /(\d{4})s?|(\d+)\s*years?\s*old/g;
      const matches = text.match(agePattern);
      
      if (matches) {
        matches.forEach(match => {
          const currentYear = new Date().getFullYear();
          let claimedYear = 0;
          
          // Extract year from match
          if (match.includes('s')) {
            claimedYear = parseInt(match.replace('s', ''));
          } else if (match.includes('years old')) {
            const yearsOld = parseInt(match.match(/\d+/)?.[0] || '0');
            claimedYear = currentYear - yearsOld;
          }
          
          if (claimedYear > currentYear - 20) {
            violations.push({
              category: 'Vintage Age Validation',
              severity: 'high',
              description: `Vintage item must be 20+ years old. Claimed age appears to be from ${claimedYear}.`,
              suggestion: 'Remove vintage designation or verify the item is actually 20+ years old with proper documentation.'
            });
          }
        });
      } else {
        violations.push({
          category: 'Vintage Age Validation',
          severity: 'medium',
          description: 'Vintage claim without specific age verification',
          suggestion: 'Specify the actual age/era of vintage items and ensure they meet the 20+ year requirement.'
        });
      }
    }
    
    return violations;
  }
  
  // Trademark and IP Violations
  private detectTrademarkViolations(text: string): PolicyViolation[] {
    const violations: PolicyViolation[] = [];
    const lowerText = text.toLowerCase();
    
    // High-risk trademark terms
    const trademarkTerms = [
      'disney', 'marvel', 'nike', 'apple', 'pokemon', 'nintendo',
      'louis vuitton', 'gucci', 'chanel', 'starbucks', 'coca cola',
      'harry potter', 'star wars', 'batman', 'superman'
    ];
    
    trademarkTerms.forEach(term => {
      if (lowerText.includes(term)) {
        violations.push({
          category: 'Trademark Violation',
          severity: 'high',
          description: `Contains trademarked term: "${term}"`,
          suggestion: `Remove "${term}" and use generic descriptions like "magical wizard theme" or "superhero style" instead.`
        });
      }
    });
    
    // Risky modifiers that don't protect from trademark issues
    const riskyModifiers = [
      'inspired', 'style', 'type', 'like', 'themed', 'replica'
    ];
    
    riskyModifiers.forEach(modifier => {
      trademarkTerms.forEach(trademark => {
        if (lowerText.includes(`${trademark} ${modifier}`) || lowerText.includes(`${modifier} ${trademark}`)) {
          violations.push({
            category: 'Trademark Violation',
            severity: 'medium',
            description: `"${modifier}" doesn't protect against trademark issues with "${trademark}"`,
            suggestion: 'Use completely generic terms that describe the style without referencing brands.'
          });
        }
      });
    });
    
    return violations;
  }
  
  // Prohibited Materials and Claims
  private detectProhibitedMaterials(text: string): PolicyViolation[] {
    const violations: PolicyViolation[] = [];
    const lowerText = text.toLowerCase();
    
    const prohibitedMaterials = [
      'ivory', 'rhino horn', 'turtle shell', 'coral',
      'endangered species', 'protected wildlife'
    ];
    
    prohibitedMaterials.forEach(material => {
      if (lowerText.includes(material)) {
        violations.push({
          category: 'Prohibited Materials',
          severity: 'high',
          description: `Contains prohibited material: "${material}"`,
          suggestion: `Remove references to "${material}" as it violates Etsy's prohibited items policy.`
        });
      }
    });
    
    // Health claims
    const healthClaims = [
      'cures', 'heals', 'treats', 'medical grade', 'therapeutic',
      'prevents disease', 'fda approved'
    ];
    
    healthClaims.forEach(claim => {
      if (lowerText.includes(claim)) {
        violations.push({
          category: 'Prohibited Claims',
          severity: 'medium',
          description: `Contains prohibited health claim: "${claim}"`,
          suggestion: 'Remove medical/health claims. Focus on decorative or craft aspects instead.'
        });
      }
    });
    
    return violations;
  }
  
  public analyzeCompliance(title: string, description: string): ComplianceResult {
    const fullText = `${title} ${description}`;
    const allViolations: PolicyViolation[] = [
      ...this.detectHandmadeViolations(fullText),
      ...this.detectProductionPartnerViolations(fullText),
      ...this.detectVintageViolations(fullText),
      ...this.detectTrademarkViolations(fullText),
      ...this.detectProhibitedMaterials(fullText)
    ];
    
    // Determine overall status
    let status: 'pass' | 'warning' | 'fail' = 'pass';
    const flaggedTerms: string[] = [];
    const suggestions: string[] = [];
    
    if (allViolations.length > 0) {
      const hasHighSeverity = allViolations.some(v => v.severity === 'high');
      status = hasHighSeverity ? 'fail' : 'warning';
      
      // Extract flagged terms and suggestions
      allViolations.forEach(violation => {
        const termMatch = violation.description.match(/"([^"]+)"/);
        if (termMatch) {
          flaggedTerms.push(termMatch[1]);
        }
        suggestions.push(violation.suggestion);
      });
    }
    
    return {
      status,
      flaggedTerms: [...new Set(flaggedTerms)], // Remove duplicates
      suggestions: [...new Set(suggestions)], // Remove duplicates
      violations: allViolations
    };
  }
}

export const complianceEngine = new EtsyComplianceEngine();
