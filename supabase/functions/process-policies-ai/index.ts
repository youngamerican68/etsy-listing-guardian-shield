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
    const { policyId, content, title } = await req.json();
    
    console.log(`Processing policy: ${title}`);

    // First, break down the policy into sections
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
            content: `Policy Title: ${title}\n\nPolicy Content:\n${content}`
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
    
    let parsedSections;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      parsedSections = JSON.parse(jsonMatch ? jsonMatch[0] : aiResponse);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      throw new Error('Failed to parse AI response');
    }

    // Store sections in database
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const processedSections = [];

    for (const [index, section] of parsedSections.sections.entries()) {
      // Insert policy section
      const { data: sectionData, error: sectionError } = await supabase
        .from('policy_sections')
        .insert({
          policy_id: policyId,
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

    console.log(`Successfully processed ${processedSections.length} sections for policy ${title}`);

    return new Response(JSON.stringify({ 
      success: true,
      sections_processed: processedSections.length,
      sections: processedSections
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