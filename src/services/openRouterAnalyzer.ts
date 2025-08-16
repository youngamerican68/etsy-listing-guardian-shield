import { supabase } from '@/integrations/supabase/client';

export interface OpenRouterComplianceResult {
  status: 'pass' | 'warning' | 'fail';
  flaggedTerms: string[];
  suggestions: string[];
  confidence: number;
  reasoning: string;
  modelUsed: string;
  tokensUsed?: number;
  // Enhanced fix suggestions
  detailedFixes?: Array<{
    originalTerm: string;
    alternatives: string[];
    reasoning: string;
    confidenceScore: number;
    estimatedFixTime: string;
    policyReference?: {
      section: string;
      link: string;
      why: string;
    };
  }>;
}

// OpenRouter API configuration
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Models we can use (Mixtral is paid but very cheap, others are free)
const PREFERRED_MODELS = [
  'mistralai/mixtral-8x7b-instruct', // Small cost but much better detection
  'mistralai/mistral-7b-instruct:free',
  'meta-llama/llama-3.1-8b-instruct:free', 
  'huggingface/zephyr-7b-beta:free',
  'openchat/openchat-7b:free'
];

export class OpenRouterAnalyzer {
  private async getRelevantPolicies(): Promise<string> {
    try {
      // Get ALL policy sections to use the complete expanded policy database
      const { data: policySections } = await supabase
        .from('policy_sections')
        .select('section_title, plain_english_summary, category, risk_level')
        .not('plain_english_summary', 'is', null)
        .order('risk_level', { ascending: false })
; // Use ALL 143 processed sections for maximum coverage

      if (!policySections || policySections.length === 0) {
        return `
        Key Etsy Policy Rules:
        1. NO trademark or brand names (Nike, Apple, Disney, Heinz, Coca-Cola, etc.)
        2. Items must be genuinely handmade, vintage (20+ years), or craft supplies
        3. No medical claims or health benefits
        4. No weapons, drugs, or illegal items
        5. No mass-produced or factory-made items in handmade category
        6. No copyrighted characters or intellectual property
        `;
      }

      return `
      Etsy Policy Sections:
      ${policySections.map(section => `
      ${section.section_title} (${section.risk_level} risk):
      ${section.plain_english_summary}
      `).join('\n')}
      `;
    } catch (error) {
      console.error('Error fetching policies:', error);
      return `
      Key Etsy Policy Rules:
      1. NO trademark or brand names (Nike, Apple, Disney, Heinz, Coca-Cola, etc.)
      2. Items must be genuinely handmade, vintage (20+ years), or craft supplies
      3. No medical claims or health benefits
      4. No weapons, drugs, or illegal items
      5. No mass-produced or factory-made items in handmade category
      6. No copyrighted characters or intellectual property
      `;
    }
  }

  private async callOpenRouter(
    model: string, 
    messages: Array<{role: string, content: string}>
  ): Promise<any> {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Etsy Listing Guardian Shield'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.1,
        max_tokens: 500,
        top_p: 0.9
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  private async analyzeWithModel(
    model: string,
    listingTitle: string,
    listingDescription: string,
    policies: string
  ): Promise<OpenRouterComplianceResult> {
    const prompt = `🚨 CRITICAL ETSY VIOLATION DETECTOR 🚨

You are an EXTREMELY STRICT Etsy compliance analyzer. Your job is to CATCH EVERY VIOLATION.

⚠️ IMMEDIATE RED FLAGS - FLAG THESE INSTANTLY:

🔥 STAR WARS (Disney copyright):
- Yoda, Boba Fett, Darth Vader, Luke Skywalker, Princess Leia, Chewbacca, R2-D2, C-3PO, Obi-Wan, Anakin, Jedi, Sith, Death Star, Millennium Falcon, Empire, Rebel Alliance

🔥 CELEBRITIES (Right of publicity):  
- Brad Pitt, Tom Cruise, Jennifer Lawrence, Leonardo DiCaprio, Angelina Jolie, Will Smith, Dwayne Johnson, Ryan Reynolds, Scarlett Johansson, Robert Downey Jr

🔥 GAMING/HORROR:
- Five Nights at Freddy's, Freddy Fazbear, Bonnie, Chica, Foxy, FNAF, Scott Cawthon
- Pokemon, Pikachu, Nintendo, Mario, Zelda, Sonic

🔥 DISNEY/MARVEL:
- Mickey Mouse, Donald Duck, Goofy, Elsa, Anna, Frozen, Lion King, Spider-Man, Iron Man, Captain America, Thor, Hulk, Avengers

🔥 DC COMICS:
- Batman, Superman, Wonder Woman, Flash, Green Lantern, Joker, Harley Quinn

🔥 OTHER MAJOR IPs:
- Harry Potter, Hogwarts, Dumbledore, Hermione, Ron Weasley
- Game of Thrones, Jon Snow, Daenerys, Tyrion
- Lord of the Rings, Gandalf, Frodo, Legolas

🚨 ANALYSIS INSTRUCTIONS:
1. Check EVERY SINGLE WORD against the lists above
2. If you find ANY match, immediately flag it as "fail"  
3. Be HYPERVIGILANT - even partial matches count
4. DO NOT give benefit of the doubt - FLAG IT
5. Better to over-flag than miss a violation

ETSY POLICY DATABASE (from your comprehensive policy analysis):
${policies}

LISTING TO ANALYZE:
Title: "${listingTitle}"
Description: "${listingDescription}"

TASK: 
1. Check against ALL the policy sections above
2. Use the comprehensive brand/celebrity examples provided
3. Scrutinize EVERY WORD for violations
4. Cross-reference with the plain English policy summaries
5. Be EXTREMELY THOROUGH - flag even subtle references

🔥 EXAMPLE VIOLATIONS TO CATCH:
- "Yoda hats" → INSTANT FLAG: Star Wars character
- "Boba Fett armor" → INSTANT FLAG: Star Wars character  
- "Five Nights at Freddy's" → INSTANT FLAG: Copyrighted game
- "Brad Pitt mask" → INSTANT FLAG: Celebrity name

RESPOND WITH JSON ONLY - BE RUTHLESS:
{
  "status": "fail",
  "flaggedTerms": ["Yoda", "Boba Fett", "Five Nights at Freddy's"],
  "violations": [
    {
      "term": "Yoda",
      "reason": "Star Wars character - Disney copyright violation",
      "severity": "high"
    },
    {
      "term": "Boba Fett", 
      "reason": "Star Wars character - Disney copyright violation",
      "severity": "high"
    },
    {
      "term": "Five Nights at Freddy's",
      "reason": "Copyrighted game franchise - IP violation", 
      "severity": "high"
    }
  ],
  "suggestions": ["Remove all Star Wars references", "Remove gaming IP references", "Use generic terms instead"],
  "reasoning": "Multiple copyright violations detected: Star Wars characters and gaming IP"
}`;

    try {
      const response = await this.callOpenRouter(model, [
        { role: 'user', content: prompt }
      ]);

      const content = response.choices?.[0]?.message?.content;
      console.log('🤖 Raw AI Response:', content);
      
      if (!content) {
        throw new Error('No response content from model');
      }

      // Try to parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('❌ No JSON found in AI response:', content);
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      console.log('🤖 Parsed AI Result:', parsed);
      
      // Whitelist of explicitly allowed terms that should never be flagged
      const allowedTerms = [
        'posters', 'poster', 'art', 'vintage', 'handmade', 'custom', 'original',
        'publications', 'films', 'photographs', 'music', 'books', 'records'
      ];
      
      // Filter out whitelisted terms from flagged terms
      const filteredFlaggedTerms = (parsed.flaggedTerms || []).filter((term: string) => 
        !allowedTerms.some(allowed => term.toLowerCase().includes(allowed.toLowerCase()))
      );
      
      console.log('🔍 Filtered flagged terms:', { original: parsed.flaggedTerms, filtered: filteredFlaggedTerms });
      
      // Determine confidence based on model response quality
      let confidence = 0.8;
      if (parsed.violations && parsed.violations.length > 0) {
        confidence = parsed.violations.some((v: any) => v.severity === 'high') ? 0.9 : 0.85;
      }

      return {
        status: filteredFlaggedTerms.length > 0 ? (parsed.status || 'warning') : 'pass',
        flaggedTerms: filteredFlaggedTerms,
        suggestions: filteredFlaggedTerms.length > 0 ? (parsed.suggestions || []) : [],
        confidence,
        reasoning: parsed.reasoning || 'AI analysis completed',
        modelUsed: model,
        tokensUsed: response.usage?.total_tokens
      };

    } catch (error) {
      console.error(`Model ${model} failed:`, error);
      throw error;
    }
  }

  public async generateFixSuggestions(
    flaggedTerm: string,
    context: string,
    violationType: string
  ): Promise<{
    alternatives: string[];
    reasoning: string;
    confidenceScore: number;
    estimatedFixTime: string;
    policyReference?: {
      section: string;
      link: string;
      why: string;
    };
  }> {
    const fixPrompt = `You are an expert Etsy policy advisor. Generate specific, actionable alternatives for a flagged term.

FLAGGED TERM: "${flaggedTerm}"
CONTEXT: "${context}"
VIOLATION TYPE: ${violationType}

CRITICAL: Your alternatives must COMPLETELY AVOID the flagged term. Do NOT include the flagged term in any form.

Generate 3-5 specific alternatives that:
1. Maintain the original meaning/intent WITHOUT using the flagged term
2. Comply with Etsy policies (NO celebrity names, trademarks, or copyrighted content)
3. Sound natural and professional
4. Are appropriate for the product context
5. Use generic descriptive terms instead of specific names

EXAMPLES:
- Instead of "Brad Pitt mask" → "Hollywood leading man mask", "Movie star costume mask", "Classic actor style mask"
- Instead of "Nike shoes" → "Athletic sneakers", "Sports footwear", "Running shoes"
- Instead of "Disney character" → "Animated character", "Fantasy character", "Children's storybook character"

RESPOND WITH JSON ONLY:
{
  "alternatives": [
    "alternative 1",
    "alternative 2", 
    "alternative 3"
  ],
  "reasoning": "Why these alternatives work and avoid policy violations",
  "confidenceScore": 0.9,
  "estimatedFixTime": "30 seconds",
  "policyReference": {
    "section": "Relevant Etsy Policy Section",
    "link": "https://help.etsy.com/relevant-section",
    "why": "Brief explanation of why original term violates this policy"
  }
}`;

    try {
      for (const model of PREFERRED_MODELS) {
        try {
          const response = await this.callOpenRouter(model, [
            { role: 'user', content: fixPrompt }
          ]);

          const content = response.choices?.[0]?.message?.content;
          if (!content) continue;

          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (!jsonMatch) continue;

          const parsed = JSON.parse(jsonMatch[0]);
          return {
            alternatives: parsed.alternatives || [],
            reasoning: parsed.reasoning || '',
            confidenceScore: parsed.confidenceScore || 0.8,
            estimatedFixTime: parsed.estimatedFixTime || '1 minute',
            policyReference: parsed.policyReference
          };
        } catch (error) {
          console.error(`Model ${model} failed for fix suggestions:`, error);
          continue;
        }
      }
    } catch (error) {
      console.error('Fix suggestion generation failed:', error);
    }

    // Fallback fix suggestions
    return this.getFallbackFixSuggestions(flaggedTerm, violationType);
  }

  private getFallbackFixSuggestions(term: string, violationType: string) {
    const fallbacks = {
      'trademark': [
        'Branded-style item',
        'Designer-inspired piece', 
        'Premium quality product'
      ],
      'celebrity': [
        'Movie star style mask',
        'Hollywood leading man costume',
        'Classic actor-inspired design',
        'Celebrity lookalike mask',
        'Famous personality style'
      ],
      'copyright': [
        'Original character design',
        'Unique artistic creation',
        'Custom character artwork',
        'Fantasy character mask'
      ],
      'ai_detected': [
        'Hollywood actor style',
        'Movie star costume mask',
        'Leading man character mask',
        'Classic film star look'
      ],
      'default': [
        'Generic alternative wording',
        'Compliant description',
        'Policy-friendly term'
      ]
    };

    const alternatives = fallbacks[violationType as keyof typeof fallbacks] || fallbacks.default;
    
    return {
      alternatives,
      reasoning: 'These alternatives help avoid policy violations while maintaining your listing\'s appeal.',
      confidenceScore: 0.6,
      estimatedFixTime: '2 minutes',
      policyReference: {
        section: 'Etsy Policy Guidelines',
        link: 'https://help.etsy.com/hc/en-us/articles/115015628847',
        why: 'Original term may conflict with Etsy marketplace policies'
      }
    };
  }

  public async analyzeCompliance(
    listingTitle: string,
    listingDescription: string
  ): Promise<OpenRouterComplianceResult> {
    console.log('🔧 OpenRouter API Key present:', !!OPENROUTER_API_KEY);
    console.log('🔧 Analyzing:', { listingTitle, listingDescription });
    
    if (!OPENROUTER_API_KEY) {
      console.warn('❌ OpenRouter API key not configured');
      return {
        status: 'warning',
        flaggedTerms: [],
        suggestions: ['OpenRouter API key not configured'],
        confidence: 0.1,
        reasoning: 'API not available',
        modelUsed: 'none'
      };
    }

    const policies = await this.getRelevantPolicies();
    
    // Try each preferred model until one works
    for (const model of PREFERRED_MODELS) {
      try {
        console.log(`🤖 Trying model: ${model}`);
        const result = await this.analyzeWithModel(model, listingTitle, listingDescription, policies);
        console.log(`✅ SUCCESS with ${model}:`, result);
        return result;
      } catch (error) {
        console.error(`❌ Model ${model} failed:`, error);
        continue;
      }
    }

    // If all models fail, return fallback
    return {
      status: 'warning',
      flaggedTerms: [],
      suggestions: ['Unable to complete AI analysis - all models unavailable'],
      confidence: 0.1,
      reasoning: 'All AI models failed',
      modelUsed: 'fallback'
    };
  }
}

// Export singleton instance
export const openRouterAnalyzer = new OpenRouterAnalyzer();