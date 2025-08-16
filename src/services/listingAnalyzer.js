import { createClient } from '@supabase/supabase-js';
import { openRouterAnalyzer } from './openRouterAnalyzer.ts';

const supabaseUrl = 'https://youjypiuqxlvyizlszmd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdWp5cGl1cXhsdnlpemxzem1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExNjE2NjQsImV4cCI6MjA2NjczNzY2NH0.Z2pTJ_bPOEm8578lBx8qMzsA1pyNBpuuvb4jmibDPcA';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Analyzes listing content against compliance rules and policy sections
 * @param {string} listingText - The listing title, description, tags, etc.
 * @returns {Promise<Object>} Analysis results with flagged issues and recommendations
 */
export async function analyzeListingContent(listingText) {
  if (!listingText || typeof listingText !== 'string') {
    throw new Error('Invalid listing text provided');
  }

  console.log('🔍 Starting listing analysis...');
  
  try {
    // Get compliance rules and policy sections in parallel
    const [complianceResult, policySectionsResult] = await Promise.all([
      supabase.from('compliance_rules').select('*'),
      supabase.from('policy_sections').select('*')
    ]);

    const complianceRules = complianceResult.data || [];
    const policySections = policySectionsResult.data || [];

    console.log(`📊 Loaded ${complianceRules.length} compliance rules and ${policySections.length} policy sections`);
    console.log('🔍 Analyzing text:', listingText);
    
    // Add hardcoded fallback rules for critical violations
    const fallbackRules = [
      { term: 'yoda', risk_level: 'high', reason: 'Star Wars character - Disney copyright violation' },
      { term: 'boba fett', risk_level: 'high', reason: 'Star Wars character - Disney copyright violation' },
      { term: 'brad pitt', risk_level: 'high', reason: 'Celebrity name - right of publicity violation' },
      { term: 'gi joe', risk_level: 'high', reason: 'Hasbro trademark violation' },
      { term: 'pokemon', risk_level: 'high', reason: 'Nintendo trademark violation' },
      { term: 'disney', risk_level: 'high', reason: 'Disney trademark violation' },
      { term: 'marvel', risk_level: 'high', reason: 'Marvel trademark violation' },
      { term: 'star wars', risk_level: 'high', reason: 'Star Wars trademark violation' }
    ];
    
    // Merge database rules with fallback rules
    const allRules = [...complianceRules, ...fallbackRules];
    console.log(`📊 Total rules (including fallbacks): ${allRules.length}`);

    // Normalize listing text for analysis
    const normalizedText = listingText.toLowerCase().trim();
    console.log('🔍 Normalized text:', normalizedText);
    
    // Results containers
    const flaggedIssues = [];
    const riskAssessment = {
      overall: 'low',
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      warning: 0
    };
    const recommendations = [];
    const matchedPolicySections = [];

    // 1. Check against compliance rules (exact term matching)
    console.log('🔍 Checking compliance rules...');
    for (const rule of allRules) {
      if (rule.term && normalizedText.includes(rule.term.toLowerCase())) {
        console.log(`🚨 VIOLATION FOUND: "${rule.term}" in "${normalizedText}"`);
        console.log(`🚨 Rule details:`, rule);
        const issue = {
          type: 'compliance_rule',
          term: rule.term,
          category: rule.category || 'copyright',
          risk_level: rule.risk_level,
          description: rule.reason,
          found_in: findTermContext(listingText, rule.term),
          policy_section: null
        };
        
        flaggedIssues.push(issue);
        
        // Update risk counters
        riskAssessment[rule.risk_level]++;
        
        // Add recommendation
        recommendations.push({
          type: 'remove_term',
          term: rule.term,
          reason: rule.reason,
          severity: rule.risk_level
        });
      }
    }

    // 2. Enhanced AI-powered analysis for comprehensive policy checking
    console.log('🤖 Running AI-powered policy analysis...');
    try {
      // Extract title and description from listing text for AI analysis
      const lines = listingText.split('\n');
      const titleLine = lines.find(line => line.toLowerCase().startsWith('title:')) || lines[0] || '';
      const descLine = lines.find(line => line.toLowerCase().startsWith('description:')) || lines.slice(1).join(' ') || '';
      
      const title = titleLine.replace(/^title:\s*/i, '').trim() || listingText.substring(0, 100);
      const description = descLine.replace(/^description:\s*/i, '').trim() || listingText.substring(100);
      
      const aiResult = await openRouterAnalyzer.analyzeCompliance(title, description);
      
      // Add AI-flagged issues to our results
      if (aiResult.status === 'fail' || aiResult.status === 'warning' || (aiResult.flaggedTerms && aiResult.flaggedTerms.length > 0)) {
        
        // If AI detected violations but flaggedTerms is empty, create a general violation
        if (aiResult.status === 'fail' && (!aiResult.flaggedTerms || aiResult.flaggedTerms.length === 0)) {
          const issue = {
            type: 'ai_analysis',
            term: 'AI Detected Violation',
            category: 'ai_detected',
            risk_level: 'high',
            description: aiResult.reasoning || 'AI detected policy violation',
            found_in: { context: listingText.substring(0, 100), fullContext: listingText },
            policy_section: 'AI Analysis',
            ai_reasoning: aiResult.reasoning,
            model_used: aiResult.modelUsed
          };
          
          flaggedIssues.push(issue);
          riskAssessment.high++;
        }
        
        // Process specific flagged terms if any
        if (aiResult.flaggedTerms && aiResult.flaggedTerms.length > 0) {
          aiResult.flaggedTerms.forEach(term => {
            const issue = {
              type: 'ai_analysis',
              term: term,
              category: 'ai_detected',
              risk_level: aiResult.status === 'fail' ? 'high' : 'medium',
              description: `AI detected potential policy violation: ${term}`,
              found_in: findTermContext(listingText, term),
              policy_section: 'AI Analysis',
              ai_reasoning: aiResult.reasoning,
              model_used: aiResult.modelUsed
            };
            
            flaggedIssues.push(issue);
            
            // Update risk counters based on AI assessment
            if (aiResult.status === 'fail') {
              riskAssessment.high++;
            } else if (aiResult.status === 'warning') {
              riskAssessment.medium++;
            }
          });
        }
        
        // Add AI suggestions to recommendations
        if (aiResult.suggestions) {
          aiResult.suggestions.forEach(suggestion => {
            recommendations.push({
              type: 'ai_suggestion',
              reason: suggestion,
              severity: aiResult.status === 'fail' ? 'high' : 'medium',
              source: 'AI Analysis'
            });
          });
        }
      }
      
      console.log(`✅ AI analysis completed using ${aiResult.modelUsed}`);
    } catch (aiError) {
      console.warn('❌ AI analysis failed, continuing with database-only analysis:', aiError);
    }

    // 3. Check against policy sections (keyword/context matching)
    console.log('🔍 Checking policy sections...');
    for (const section of policySections) {
      const matchScore = calculatePolicyMatch(normalizedText, section);
      
      if (matchScore > 0.3) { // Threshold for relevance
        matchedPolicySections.push({
          ...section,
          match_score: matchScore
        });
        
        // If it's a high-risk section and closely matches, flag it
        if (matchScore > 0.6 && (section.risk_level === 'high' || section.risk_level === 'critical')) {
          const issue = {
            type: 'policy_section',
            term: extractRelevantKeywords(section.section_title),
            category: section.category,
            risk_level: section.risk_level,
            description: section.plain_english_summary,
            found_in: section.section_title,
            policy_section: section.section_title
          };
          
          flaggedIssues.push(issue);
          riskAssessment[section.risk_level]++;
        }
      }
    }

    // 4. Group issues by identical terms and create occurrence tracking
    const groupedIssues = groupIssuesByTerm(flaggedIssues);
    
    // Update flaggedIssues with grouped issues
    flaggedIssues.length = 0;
    flaggedIssues.push(...groupedIssues);
    
    // Recalculate risk assessment
    Object.keys(riskAssessment).forEach(key => {
      if (key !== 'overall') riskAssessment[key] = 0;
    });
    
    flaggedIssues.forEach(issue => {
      riskAssessment[issue.risk_level]++;
    });

    // 5. Determine overall risk level
    if (riskAssessment.critical > 0) {
      riskAssessment.overall = 'critical';
    } else if (riskAssessment.high > 0) {
      riskAssessment.overall = 'high';
    } else if (riskAssessment.medium > 0) {
      riskAssessment.overall = 'medium';
    } else if (riskAssessment.warning > 0) {
      riskAssessment.overall = 'warning';
    }

    // 6. Calculate compliance score and analyze section health
    const complianceScore = calculateComplianceScore(riskAssessment, flaggedIssues.length);
    const sectionHealth = analyzeSectionHealth(listingText, flaggedIssues);

    // 7. Generate summary recommendations
    const summaryRecommendations = generateSummaryRecommendations(flaggedIssues, riskAssessment);

    // 8. Create enhanced analysis report
    const analysisReport = {
      timestamp: new Date().toISOString(),
      listing_text: listingText,
      analysis_results: {
        total_issues: flaggedIssues.length,
        compliance_score: complianceScore,
        risk_assessment: riskAssessment,
        flagged_issues: flaggedIssues,
        matched_policy_sections: matchedPolicySections,
        recommendations: recommendations,
        summary_recommendations: summaryRecommendations,
        section_health: sectionHealth,
        // Enhanced data for UI components
        ui_data: {
          has_grouped_issues: flaggedIssues.some(issue => issue.isGrouped),
          total_occurrences: flaggedIssues.reduce((sum, issue) => sum + (issue.occurrenceCount || 1), 0),
          clean_sections: sectionHealth.filter(section => section.status === 'pass'),
          problem_sections: sectionHealth.filter(section => section.status !== 'pass')
        }
      },
      compliance_status: flaggedIssues.length === 0 ? 'compliant' : 'needs_review'
    };

    console.log(`✅ Analysis complete: ${flaggedIssues.length} issues found, overall risk: ${riskAssessment.overall}`);
    console.log(`🔍 Final flagged issues:`, flaggedIssues);
    console.log(`🔍 Final analysis report:`, analysisReport);
    return analysisReport;

  } catch (error) {
    console.error('❌ Error analyzing listing:', error);
    throw new Error(`Analysis failed: ${error.message}`);
  }
}

/**
 * Finds the context around a flagged term in the original text with word boundaries
 */
function findTermContext(text, term, contextWords = 10) {
  const lowerText = text.toLowerCase();
  const lowerTerm = term.toLowerCase();
  const index = lowerText.indexOf(lowerTerm);
  
  if (index === -1) return null;
  
  // Split text into words while preserving original case
  const words = text.match(/\S+/g) || [];
  const lowerWords = words.map(w => w.toLowerCase());
  
  // Find the word that contains our term
  let termWordIndex = -1;
  for (let i = 0; i < lowerWords.length; i++) {
    if (lowerWords[i].includes(lowerTerm)) {
      termWordIndex = i;
      break;
    }
  }
  
  if (termWordIndex === -1) {
    // Fallback to character-based context
    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + term.length + 50);
    const shortContext = text.substring(start, end);
    
    return {
      context: shortContext,
      fullContext: shortContext,
      position: index,
      beforeContext: text.substring(start, index),
      termText: text.substring(index, index + term.length),
      afterContext: text.substring(index + term.length, end),
      wordBoundary: false
    };
  }
  
  // Get contextWords before and after the flagged term
  const startWordIndex = Math.max(0, termWordIndex - contextWords);
  const endWordIndex = Math.min(words.length, termWordIndex + contextWords + 1);
  
  const beforeWords = words.slice(startWordIndex, termWordIndex);
  const flaggedWord = words[termWordIndex];
  const afterWords = words.slice(termWordIndex + 1, endWordIndex);
  
  const beforeContext = beforeWords.join(' ');
  const afterContext = afterWords.join(' ');
  const contextSnippet = [...beforeWords, flaggedWord, ...afterWords].join(' ');
  
  // Get full sentence context
  const sentences = text.split(/[.!?]+/);
  let fullSentence = '';
  
  for (const sentence of sentences) {
    if (sentence.toLowerCase().includes(lowerTerm)) {
      fullSentence = sentence.trim();
      break;
    }
  }
  
  // If no sentence found, try paragraph context
  if (!fullSentence) {
    const paragraphs = text.split(/\n\s*\n/);
    for (const paragraph of paragraphs) {
      if (paragraph.toLowerCase().includes(lowerTerm)) {
        fullSentence = paragraph.trim();
        break;
      }
    }
  }
  
  return {
    context: contextSnippet,
    fullContext: fullSentence || contextSnippet,
    position: index,
    beforeContext,
    termText: flaggedWord,
    afterContext,
    wordBoundary: true,
    // Enhanced context for UI display
    displayContext: {
      before: beforeContext,
      term: flaggedWord,
      after: afterContext,
      wordCount: {
        before: beforeWords.length,
        after: afterWords.length
      }
    }
  };
}

/**
 * Calculates how well a policy section matches the listing content
 */
function calculatePolicyMatch(listingText, policySection) {
  if (!policySection.section_title || !policySection.plain_english_summary) {
    return 0;
  }
  
  const policyKeywords = extractKeywords(
    policySection.section_title + ' ' + policySection.plain_english_summary
  );
  
  let matchCount = 0;
  for (const keyword of policyKeywords) {
    if (listingText.includes(keyword.toLowerCase())) {
      matchCount++;
    }
  }
  
  return policyKeywords.length > 0 ? matchCount / policyKeywords.length : 0;
}

/**
 * Extracts relevant keywords from policy text
 */
function extractKeywords(text) {
  const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'a', 'an'];
  
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.includes(word))
    .slice(0, 10); // Top 10 keywords
}

/**
 * Extracts relevant keywords from section titles
 */
function extractRelevantKeywords(sectionTitle) {
  return sectionTitle
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .slice(0, 3)
    .join(', ');
}

/**
 * Groups issues by identical terms and tracks occurrences
 */
function groupIssuesByTerm(issues) {
  const termGroups = new Map();
  const groupedIssues = [];
  
  // Group issues by normalized term
  for (const issue of issues) {
    const normalizedTerm = issue.term.toLowerCase().trim();
    
    if (!termGroups.has(normalizedTerm)) {
      // Create new group
      const group = {
        ...issue,
        occurrences: [issue],
        occurrenceCount: 1,
        groupId: `group_${normalizedTerm.replace(/[^a-zA-Z0-9]/g, '_')}`,
        isGrouped: false
      };
      termGroups.set(normalizedTerm, group);
      groupedIssues.push(group);
    } else {
      // Add to existing group
      const existingGroup = termGroups.get(normalizedTerm);
      existingGroup.occurrences.push(issue);
      existingGroup.occurrenceCount++;
      existingGroup.isGrouped = true;
      
      // Keep the highest risk level
      const riskPriority = { critical: 4, high: 3, medium: 2, low: 1, warning: 0 };
      if (riskPriority[issue.risk_level] > riskPriority[existingGroup.risk_level]) {
        existingGroup.risk_level = issue.risk_level;
        existingGroup.description = issue.description || existingGroup.description;
      }
      
      // Merge found_in contexts if different
      if (issue.found_in && existingGroup.found_in) {
        if (!existingGroup.found_in.multipleContexts) {
          existingGroup.found_in.multipleContexts = [existingGroup.found_in];
        }
        existingGroup.found_in.multipleContexts.push(issue.found_in);
      }
    }
  }
  
  return groupedIssues;
}

/**
 * Calculates a compliance score from 0-100 based on risk assessment
 */
function calculateComplianceScore(riskAssessment, totalIssues) {
  let score = 100;
  
  // More aggressive scoring for violations
  score -= riskAssessment.critical * 40;  // Critical issues: -40 points each (was 25)
  score -= riskAssessment.high * 30;      // High issues: -30 points each (was 15)
  score -= riskAssessment.medium * 15;    // Medium issues: -15 points each (was 8)
  score -= riskAssessment.low * 5;        // Low issues: -5 points each (was 3)
  score -= riskAssessment.warning * 2;    // Warning issues: -2 points each (was 1)
  
  // Celebrity and trademark violations get extra penalty
  if (riskAssessment.high > 0 || riskAssessment.critical > 0) {
    score -= 20; // Additional -20 for any high-risk violations
  }
  
  // Ensure score doesn't go below 0
  return Math.max(0, Math.min(100, score));
}

/**
 * Analyzes which sections of the listing have no violations for positive reinforcement
 */
function analyzeSectionHealth(listingText, flaggedIssues) {
  const sections = [
    { name: 'Title', content: '' },
    { name: 'Description', content: '' },
    { name: 'Tags', content: '' },
    { name: 'Category', content: '' },
    { name: 'Price', content: '' }
  ];
  
  // Extract content for each section
  const lines = listingText.split('\n');
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (lowerLine.startsWith('title:')) {
      sections[0].content = line.substring(6).trim();
    } else if (lowerLine.startsWith('description:')) {
      sections[1].content = line.substring(12).trim();
    } else if (lowerLine.startsWith('tags:')) {
      sections[2].content = line.substring(5).trim();
    } else if (lowerLine.startsWith('category:')) {
      sections[3].content = line.substring(9).trim();
    } else if (lowerLine.startsWith('price:')) {
      sections[4].content = line.substring(6).trim();
    }
  }
  
  // Check which sections have violations
  const sectionStatus = sections.map(section => {
    const sectionIssues = flaggedIssues.filter(issue => {
      if (!section.content) return false;
      
      // Check if the flagged term appears in this section's content
      const sectionLower = section.content.toLowerCase();
      const termLower = issue.term.toLowerCase();
      
      // Direct term match in section content
      if (sectionLower.includes(termLower)) {
        return true;
      }
      
      // Check if the context includes this section's content
      if (issue.found_in?.context) {
        const contextLower = issue.found_in.context.toLowerCase();
        // Check if context matches section content
        return contextLower.includes(sectionLower.substring(0, Math.min(50, sectionLower.length)));
      }
      
      return false;
    });
    
    const status = sectionIssues.length === 0 ? 'pass' : 
                   sectionIssues.some(issue => ['critical', 'high'].includes(issue.risk_level)) ? 'fail' : 'warning';
    
    return {
      name: section.name,
      status,
      issueCount: sectionIssues.length,
      content: section.content
    };
  });
  
  return sectionStatus;
}

/**
 * Generates summary recommendations based on analysis results
 */
function generateSummaryRecommendations(flaggedIssues, riskAssessment) {
  const recommendations = [];
  
  if (riskAssessment.critical > 0) {
    recommendations.push({
      priority: 'critical',
      message: `Your listing contains ${riskAssessment.critical} critical policy violations that must be addressed before listing.`,
      action: 'Review and remove all flagged critical terms immediately.'
    });
  }
  
  if (riskAssessment.high > 0) {
    recommendations.push({
      priority: 'high',
      message: `${riskAssessment.high} high-risk issues detected that could lead to listing removal.`,
      action: 'Modify or remove high-risk terms and phrases.'
    });
  }
  
  if (riskAssessment.medium > 0) {
    recommendations.push({
      priority: 'medium',
      message: `${riskAssessment.medium} medium-risk issues may require attention.`,
      action: 'Review medium-risk items and consider alternative wording.'
    });
  }
  
  if (riskAssessment.warning > 0) {
    recommendations.push({
      priority: 'warning',
      message: `${riskAssessment.warning} warning-level issues detected.`,
      action: 'Review flagged terms for potential policy concerns.'
    });
  }
  
  if (flaggedIssues.length === 0) {
    recommendations.push({
      priority: 'success',
      message: 'No policy violations detected in your listing.',
      action: 'Your listing appears to be compliant with Etsy policies.'
    });
  }
  
  return recommendations;
}

/**
 * Test function to analyze sample listing content
 */
export async function testAnalysis() {
  const sampleListing = `
    Handmade vintage-style leather bag with brass hardware.
    Perfect for everyday use. Made with genuine leather.
    Not affiliated with any designer brands.
    Ships worldwide. Medical benefits not claimed.
  `;
  
  console.log('🧪 Testing analysis with sample listing...');
  
  try {
    const results = await analyzeListingContent(sampleListing);
    console.log('📊 Test Results:');
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Export for use in other modules
export default {
  analyzeListingContent,
  testAnalysis
};