import { supabase } from '@/integrations/supabase/client';

export interface OpenRouterComplianceResult {
  status: 'pass' | 'warning' | 'fail';
  flaggedTerms: string[];
  confidence: number;
  reasoning: string;
  modelUsed: string;
  tokensUsed?: number;
  // Binary violation data
  violations?: Array<{
    term: string;
    category: 'trademark' | 'copyright' | 'celebrity' | 'potential_ip' | 'policy_violation' | 'other';
    policy_section?: string;
    context?: string;
    confidence: number;
  }>;
}

// OpenRouter API configuration
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Models we can use (Mixtral is paid but very cheap, others are free)
const PREFERRED_MODELS = [
  'mistralai/mixtral-8x7b-instruct', // Primary testing model - reliable and cost-effective
  'openai/gpt-4o', // Backup - excellent instruction following
  'anthropic/claude-3.5-sonnet', // Backup - nuanced policy detection
  'meta-llama/llama-3.1-70b-instruct', // Good balance of cost/performance
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
    const prompt = `ETSY COMPLIANCE ANALYZER - BINARY VIOLATION DETECTION

You are an Etsy policy compliance analyzer. Your job is to identify policy violations in listings using official Etsy policies. Use a simple BINARY system: either something violates Etsy policies or it doesn't.

ETSY POLICY DATABASE:
${policies}
[This contains the full 143+ Etsy policy sections including:
- Prohibited Items Policy
- Intellectual Property Policy
- Handmade Policy
- Vintage Policy
- Craft Supplies Policy
- Reselling Policy
- Mature Content Policy
- Violent Items Policy
- Hate Items Policy
- Regulated Items Policy
- Services Policy
- Digital Items Policy
And all other official Etsy policies]

Use the above official Etsy policies as your PRIMARY reference for violations. Check every listing against these comprehensive policies first.

VIOLATIONS TO FLAG:
These are clear violations that should be flagged:

- PROTECTED CHARACTERS/FRANCHISES:
  - Star Wars: Yoda, Darth Vader, Luke Skywalker, Leia, Chewbacca, R2-D2, C-3PO, Millennium Falcon, Jedi, Sith, lightsaber
  - Disney: Mickey Mouse, Minnie, Donald Duck, Elsa, Anna, Simba, Moana
  - Marvel: Spider-Man, Iron Man, Captain America, Thor, Hulk, Black Widow, Avengers
  - DC: Batman, Superman, Wonder Woman, Joker, Harley Quinn
  - Gaming: Mario, Luigi, Pikachu, Pokemon, Zelda, Link, Sonic, Minecraft, Fortnite
  - Other: Harry Potter, Hogwarts, SpongeBob, Peppa Pig, Paw Patrol

- TRADEMARKS:
  - Fashion: Nike, Adidas, Gucci, Louis Vuitton, Chanel, Supreme, Balenciaga
  - Tech: Apple, iPhone, Samsung, PlayStation, Xbox
  - Brands: Coca-Cola, Pepsi, Starbucks, McDonald's

- CELEBRITIES & PUBLIC FIGURES:
  - Actors: Tom Cruise, Brad Pitt, Angelina Jolie, Leonardo DiCaprio, Jennifer Lawrence, Will Smith, Scarlett Johansson, Marlon Brando, James Dean, Marilyn Monroe
  - Musicians: Taylor Swift, Beyoncé, Drake, Kanye West, Billie Eilish, BTS, Kelly Pickler, Elvis Presley, Bob Marley
  - Athletes: LeBron James, Cristiano Ronaldo, Lionel Messi, Tom Brady, Serena Williams, Reggie Jackson
  - Any other recognizable public figures or celebrities

- POLICY VIOLATIONS (from Etsy Policy Database):
  - Any items explicitly prohibited in the policy database
  - Clear violations of handmade, vintage, or craft supply requirements
  - Regulated items without proper compliance

NEVER FLAG - LEGITIMATE TERMS:
- Product categories: posters, canvas, prints, stickers, shirts, mugs
- Personal care: shavers, razors, dermapen, skincare, grooming
- Descriptive words: vintage, retro, classic, style, inspired, alternative
- Common materials: leather, cotton, metal, wood, plastic
- Generic adjectives: big, small, blue, red, professional, luxury
- Terms explicitly allowed in Etsy policies

DECISION FLOW:
1. Check against Etsy Policy Database for explicit violations
2. Is it a clear violation? → FLAG IT
3. Is it in NEVER FLAG? → DO NOT flag
4. If uncertain, err on the side of caution and flag it if it resembles a brand, public figure, or copyrighted content

RESPONSE FORMAT:
{
  "violations": [
    {
      "term": "detected term",
      "category": "trademark|copyright|celebrity|policy_violation|other",
      "policy_section": "specific Etsy policy violated if applicable",
      "context": "brief explanation of why this violates policy",
      "confidence": 0.0-1.0
    }
  ],
  "safe_terms": ["terms that were checked but are safe"],
  "policy_compliance_notes": "any additional Etsy policy considerations"
}

LISTING TO ANALYZE:
Title: "${listingTitle}"
Description: "${listingDescription}"

Analyze the listing above against the Etsy Policy Database first, then apply the tier classification system. Be precise - only flag terms that appear in the listing. Include context for medium and low risk items to help sellers understand the reasoning. Reference specific Etsy policy sections when applicable.`;

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
      
      // Process the new violations array format
      const violations = parsed.violations || [];
      
      // Filter out violations that are in the "Never Flag" category
      const allowedTerms = [
        'posters', 'poster', 'art', 'vintage', 'handmade', 'custom', 'original',
        'publications', 'films', 'photographs', 'music', 'books', 'records',
        'armpit', 'shavers', 'grooming', 'personal care', 'hygiene', 'beauty',
        'body', 'hair removal', 'shaving', 'trimmer', 'razor', 'dermapen', 'skincare'
      ];
      
      const filteredViolations = violations.filter((violation: any) => {
        const term = violation.term?.toLowerCase() || '';
        const isAllowed = allowedTerms.some(allowed => 
          term.includes(allowed.toLowerCase())
        );
        
        if (isAllowed) {
          console.warn(`🚨 Filtering out whitelisted term: "${violation.term}"`);
        }
        return !isAllowed;
      });
      
      // Validate that flagged terms actually exist in the input text
      const inputText = `${listingTitle} ${listingDescription}`.toLowerCase();
      const validatedViolations = filteredViolations.filter((violation: any) => {
        const term = violation.term?.toLowerCase() || '';
        const exists = inputText.includes(term) || 
                      term.split(' ').some((word: string) => inputText.includes(word));
        
        if (!exists) {
          console.warn(`🚨 AI hallucinated term "${violation.term}" - not found in input text`);
        }
        return exists;
      });
      
      // Convert back to legacy format for compatibility
      const flaggedTerms = validatedViolations.map((v: any) => v.term);
      
      console.log('🔍 Processed violations:', { 
        original: violations.length, 
        afterWhitelist: filteredViolations.length,
        afterValidation: validatedViolations.length,
        flaggedTerms 
      });
      
      // Determine confidence and status - binary system
      let confidence = 0.8;
      let status = 'pass';
      
      if (validatedViolations.length > 0) {
        status = 'fail';
        confidence = 0.9;
      }

      return {
        status,
        flaggedTerms,
        // No longer generating suggestions
        confidence,
        reasoning: parsed.policy_compliance_notes || parsed.reasoning || 'AI analysis completed',
        modelUsed: model,
        tokensUsed: response.usage?.total_tokens,
        // Include binary violation data
        violations: validatedViolations
      };

    } catch (error) {
      console.error(`Model ${model} failed:`, error);
      throw error;
    }
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
      confidence: 0.1,
      reasoning: 'All AI models failed',
      modelUsed: 'fallback'
    };
  }
}

// Export singleton instance
export const openRouterAnalyzer = new OpenRouterAnalyzer();