// supabase/functions/process-policies-ai/index.ts
// FINAL, SIMPLIFIED "DUMB WORKER" VERSION

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

// Helper to repair JSON - no changes needed
function repairJsonString(jsonString: string): string {
  try { JSON.parse(jsonString); return jsonString; }
  catch { return jsonString.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']').replace(/([{,]\s*)(\w+):/g, '$1"$2":').replace(/:\s*'([^']*)'/g, ':"$1"').replace(/\\'/g, "'").replace(/\n/g, '\\n'); }
}

// Helper to analyze a SINGLE section - this is the core of the function now
async function analyzeSection(sectionTitle: string, sectionContent: string, policyCategory: string, apiKey: string) {
  const prompt = `Analyze this specific section from Etsy's ${policyCategory} policy. Section Title: ${sectionTitle}. Section Content: ${sectionContent}. Provide a JSON response with this structure: { "section_title": "${sectionTitle}", "section_content": "full section text", "plain_english_summary": "clear 2-3 sentence summary of what this section means for sellers", "category": "one of: account_management, listing_requirements, prohibited_content, payment_fees, intellectual_property, community_guidelines, legal_terms", "risk_level": "one of: low, medium, high" }. Focus on practical implications for Etsy sellers.`;
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.2, max_tokens: 1500 }),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API request failed: ${response.status} ${errorBody}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // This function now expects everything it needs to process ONE section
    const { jobId, policyId, sectionTitle, sectionContent, policyCategory, contentHash, orderIndex } = await req.json();

    if (!jobId || !policyId || !sectionTitle || !sectionContent || !policyCategory || !contentHash) {
      throw new Error('Missing required parameters for section processing.');
    }

    // Update job progress
    await supabase.from('policy_analysis_jobs').update({
      progress_message: `Analyzing section: ${sectionTitle}`
    }).eq('id', jobId);

    // Call OpenAI to analyze the section
    const aiResponse = await analyzeSection(sectionTitle, sectionContent, policyCategory, openAIApiKey!);
    const parsed = JSON.parse(repairJsonString(aiResponse));

    // Insert the processed section into the database
    const { error: insertError } = await supabase.from('policy_sections').insert({
      policy_id: policyId,
      section_title: parsed.section_title || sectionTitle,
      section_content: parsed.section_content || sectionContent,
      plain_english_summary: parsed.plain_english_summary || '',
      category: parsed.category || 'general',
      risk_level: parsed.risk_level || 'medium',
      content_hash: contentHash,
      order_index: orderIndex
    });

    if (insertError) {
      // Handle duplicates gracefully without failing the whole job
      if (insertError.code === '23505') {
        console.warn(`Duplicate section skipped: ${sectionTitle}`);
      } else {
        throw insertError;
      }
    }

    return new Response(JSON.stringify({ success: true, message: `Successfully processed section: ${sectionTitle}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('CRITICAL ERROR in section worker:', error.message);
    const { jobId } = await req.json().catch(() => ({}));
    if (jobId) {
      await supabase.from('policy_analysis_jobs').update({ status: 'failed', error_message: error.message }).eq('id', jobId);
    }
    return new Response(JSON.stringify({ error: error.message, success: false }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});