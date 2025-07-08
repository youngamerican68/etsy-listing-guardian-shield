import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PolicySection {
  section_title: string;
  section_content: string;
  plain_english_summary: string;
  category: string;
  risk_level: string;
  keywords: Array<{
    keyword: string;
    risk_level: string;
    context: string;
  }>;
}

// Helper function to repair common JSON syntax errors
function repairJsonString(jsonStr: string): string {
  let repaired = jsonStr;
  
  // Remove any leading/trailing whitespace and non-JSON characters
  repaired = repaired.trim();
  
  // Find JSON object boundaries
  const startIndex = repaired.indexOf('{');
  const lastIndex = repaired.lastIndexOf('}');
  if (startIndex !== -1 && lastIndex !== -1) {
    repaired = repaired.substring(startIndex, lastIndex + 1);
  }
  
  // Fix missing commas between object properties
  repaired = repaired.replace(/}(\s*)"/g, '},$1"');
  repaired = repaired.replace(/](\s*)"/g, '],$1"');
  repaired = repaired.replace(/"(\s*)\{/g, '",$1{');
  repaired = repaired.replace(/"(\s*)\[/g, '",$1[');
  
  // Fix missing commas in arrays
  repaired = repaired.replace(/}(\s*)\{/g, '},$1{');
  
  // Fix trailing commas (remove them)
  repaired = repaired.replace(/,(\s*)[}\]]/g, '$1$2');
  
  return repaired;
}

// Function to process policy with AI with retry mechanism
async function processWithAIRetry(policy: any, openAIApiKey: string, maxRetries = 3): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`AI processing attempt ${attempt} for policy: ${policy.category}`);
      
      const sectionsResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-2025-04-14',
          messages: [
            {
              role: 'system',
              content: `You are an expert at analyzing Etsy's Terms of Service and policies. Break down the given policy text into logical sections that cover specific rules or topics. For each section, provide:

1. A clear section title
2. The exact content/text for that section
3. A plain English summary (2-3 sentences max)
4. The category (account_integrity, intellectual_property, prohibited_items, handmade_reselling, fees_payments, or community_conduct)
5. Risk level (low, medium, high, critical) based on potential consequences for sellers
6. Extract 3-5 key prohibited terms/keywords with risk levels and context

IMPORTANT: You must respond with a single, perfectly valid JSON object and nothing else. Ensure all properties and array elements are correctly formatted and separated by commas.

Return as JSON array with this structure:
{
  "sections": [
    {
      "section_title": "Clear descriptive title",
      "section_content": "Exact policy text",
      "plain_english_summary": "Simple explanation",
      "category": "category_name",
      "risk_level": "risk_level",
      "keywords": [
        {
          "keyword": "specific term",
          "risk_level": "risk_level", 
          "context": "why this term is problematic"
        }
      ]
    }
  ]
}`
            },
            {
              role: 'user',
              content: `Policy Title: ${policy.category}\n\nPolicy Content:\n${policy.content}`
            }
          ],
          temperature: 0.3,
          max_tokens: 4000
        }),
      });

      if (!sectionsResponse.ok) {
        throw new Error(`OpenAI API error: ${sectionsResponse.status}`);
      }

      const sectionsData = await sectionsResponse.json();
      const aiResponse = sectionsData.choices[0].message.content;
      
      // Try to parse the response
      let parsedSections;
      try {
        // First attempt: direct parsing
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : aiResponse;
        parsedSections = JSON.parse(jsonStr);
      } catch (parseError) {
        console.log(`JSON parse failed on attempt ${attempt}, trying repair...`);
        
        // Second attempt: repair and parse
        try {
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          const jsonStr = jsonMatch ? jsonMatch[0] : aiResponse;
          const repairedJson = repairJsonString(jsonStr);
          parsedSections = JSON.parse(repairedJson);
        } catch (repairError) {
          if (attempt === maxRetries) {
            console.error('Final attempt failed. Original response:', aiResponse);
            throw new Error(`Failed to parse AI response after ${maxRetries} attempts: ${repairError.message}`);
          }
          console.log(`Repair failed on attempt ${attempt}, retrying...`);
          continue;
        }
      }
      
      // Validate the structure
      if (!parsedSections.sections || !Array.isArray(parsedSections.sections)) {
        throw new Error('Invalid response structure: missing sections array');
      }
      
      console.log(`Successfully parsed AI response on attempt ${attempt}`);
      return parsedSections;
      
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      console.log(`Attempt ${attempt} failed, retrying: ${error.message}`);
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!openAIApiKey) {
    return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    console.log('Starting policy processing from local policies.json');

    // Read policies from local file
    const policiesResponse = await fetch('https://raw.githubusercontent.com/youngamerican68/etsy-listing-guardian-shield/main/policies.json');
    
    if (!policiesResponse.ok) {
      throw new Error(`Failed to fetch policies.json: ${policiesResponse.status}`);
    }
    
    const policiesData = await policiesResponse.json();
    console.log('Raw policies data structure:', JSON.stringify(policiesData, null, 2).substring(0, 500));
    
    // Handle different possible JSON structures
    const policies = Array.isArray(policiesData) ? policiesData : policiesData.policies || [];
    console.log(`Loaded ${policies.length} policies from file`);
    
    if (policies.length === 0) {
      throw new Error('No policies found in the JSON file');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    let totalPoliciesProcessed = 0;
    let totalSectionsCreated = 0;
    let totalKeywordsExtracted = 0;

    // Process each policy
    console.log('First policy sample:', JSON.stringify(policies[0], null, 2));
    
    for (const policy of policies) {
      console.log(`Processing policy object:`, typeof policy, policy);
      console.log(`Processing policy: ${policy?.category}`);

      // First, store the policy in the database
      const { data: policyData, error: policyError } = await supabase
        .from('etsy_policies')
        .upsert({
          title: policy.category,
          url: policy.url,
          content: policy.content,
          category: policy.category,
          last_updated: policy.lastUpdated ? new Date(policy.lastUpdated).toISOString() : null,
          scraped_at: new Date().toISOString(),
          is_active: true
        }, {
          onConflict: 'url'
        })
        .select()
        .single();

      if (policyError) {
        console.error(`Error storing policy ${policy.category}:`, policyError);
        continue;
      }

      // Process the policy with AI using retry mechanism
      const parsedSections = await processWithAIRetry(policy, openAIApiKey);

      // Store sections in database for this policy
      const processedSections = [];

      for (const [index, section] of parsedSections.sections.entries()) {
        // Insert policy section
        const { data: sectionData, error: sectionError } = await supabase
          .from('policy_sections')
          .insert({
            policy_id: policyData.id,
            section_title: section.section_title,
            section_content: section.section_content,
            plain_english_summary: section.plain_english_summary,
            category: section.category,
            risk_level: section.risk_level,
            order_index: index
          })
          .select()
          .single();

        if (sectionError) {
          console.error('Error inserting section:', sectionError);
          continue;
        }

        // Insert keywords for this section
        if (section.keywords && section.keywords.length > 0) {
          const keywordInserts = section.keywords.map(kw => ({
            policy_section_id: sectionData.id,
            keyword: kw.keyword.toLowerCase(),
            risk_level: kw.risk_level,
            context: kw.context
          }));

          const { error: keywordError } = await supabase
            .from('policy_keywords')
            .insert(keywordInserts);

          if (keywordError) {
            console.error('Error inserting keywords:', keywordError);
          }
        }

        processedSections.push({
          ...section,
          id: sectionData.id,
          keywords_count: section.keywords?.length || 0
        });
      }

      console.log(`Successfully processed ${processedSections.length} sections for policy ${policy.category}`);
      
      totalPoliciesProcessed++;
      totalSectionsCreated += processedSections.length;
      
      // Count keywords extracted
      for (const section of processedSections) {
        totalKeywordsExtracted += section.keywords_count || 0;
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      policies_processed: totalPoliciesProcessed,
      sections_created: totalSectionsCreated,
      keywords_extracted: totalKeywordsExtracted,
      message: `Successfully processed ${totalPoliciesProcessed} policies, created ${totalSectionsCreated} sections, and extracted ${totalKeywordsExtracted} keywords.`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-policies-ai function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});