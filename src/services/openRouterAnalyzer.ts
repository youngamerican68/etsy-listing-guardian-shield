import { supabase } from '@/integrations/supabase/client';

export interface OpenRouterComplianceResult {
  status: 'pass' | 'warning' | 'fail';
  flaggedTerms: string[];
  suggestions: string[];
  confidence: number;
  reasoning: string;
  modelUsed: string;
  tokensUsed?: number;
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
    const prompt = `You are an expert Etsy compliance analyzer. Analyze this listing for ALL policy violations with MAXIMUM sensitivity.

🚨 ETSY PROHIBITS (Flag ANY occurrence):

1. TRADEMARK/BRAND VIOLATIONS:
   - Corporate brands: Nike, Apple, Disney, Coca-Cola, McDonald's, Starbucks
   - Entertainment: Marvel, Pokemon, Star Wars, Harry Potter, Nintendo
   - Fashion: Gucci, Louis Vuitton, Chanel, Coach, Prada
   - Sports: NFL, NBA, MLB, FIFA, Olympics
   - Food brands: Hershey, Oreo, Kraft, Heinz

2. CELEBRITY/PUBLIC FIGURE VIOLATIONS:
   - Actors: Brad Pitt, Tom Cruise, Jennifer Lawrence, Leonardo DiCaprio
   - Musicians: Taylor Swift, Beyonce, Drake, Ariana Grande
   - Politicians: Any president, prime minister, political figure
   - Influencers: Kim Kardashian, Elon Musk, Oprah
   - Historical figures: Einstein, Gandhi (if used commercially)

3. CHARACTER/IP VIOLATIONS:
   - Disney: Mickey Mouse, Elsa, Anna, Simba, Buzz Lightyear
   - Marvel/DC: Spider-Man, Batman, Superman, Iron Man, Hulk
   - Anime: Naruto, Goku, Pikachu, Hello Kitty
   - Movies/TV: Harry Potter, Game of Thrones characters

4. DANGEROUS PATTERN PHRASES:
   - "look like [person]", "similar to [brand]", "[celebrity] style"
   - "inspired by [brand/person]", "knockoff", "replica"
   - "healing", "cure", "medical", "FDA approved" (health claims)
   - "vintage [brand]" if using trademark

5. PROHIBITED ITEMS:
   - Weapons, drugs, recalled items
   - Adult content, hazardous materials
   - Counterfeit, dropshipping indicators

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

RESPOND WITH JSON ONLY:
{
  "status": "fail",
  "flaggedTerms": ["Brad Pitt"],
  "violations": [
    {
      "term": "Brad Pitt",
      "reason": "Celebrity names cannot be used in listings due to right of publicity laws",
      "severity": "high"
    }
  ],
  "suggestions": ["Remove celebrity reference and use generic terms like 'handsome actor style' instead"],
  "reasoning": "Found celebrity likeness violation: Using Brad Pitt's name violates right of publicity"
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
      
      // Determine confidence based on model response quality
      let confidence = 0.8;
      if (parsed.violations && parsed.violations.length > 0) {
        confidence = parsed.violations.some((v: any) => v.severity === 'high') ? 0.9 : 0.85;
      }

      return {
        status: parsed.status || 'warning',
        flaggedTerms: parsed.flaggedTerms || [],
        suggestions: parsed.suggestions || [],
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