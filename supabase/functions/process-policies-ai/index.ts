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

// Helper to repair JSON - handles markdown code blocks and malformed JSON
function repairJsonString(jsonString: string): string {
  // Remove markdown code block wrapper if present
  let cleaned = jsonString.replace(/^```(?:json)?\s*\n/, '').replace(/\n```\s*$/, '').trim();
  
  try { 
    JSON.parse(cleaned); 
    return cleaned; 
  } catch { 
    return cleaned
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      .replace(/([{,]\s*)(\w+):/g, '$1"$2":')
      .replace(/:\s*'([^']*)'/g, ':"$1"')
      .replace(/\\'/g, "'")
      .replace(/\n/g, '\\n'); 
  }
}

// Helper to analyze a SINGLE section - this is the core of the function now
async function analyzeSection(sectionTitle: string, sectionContent: string, policyCategory: string, apiKey: string) {
  const prompt = `Analyze this specific section from Etsy's ${policyCategory} policy. Section Title: ${sectionTitle}. Section Content: ${sectionContent}. Provide a JSON response with this structure: { "section_title": "${sectionTitle}", "section_content": "full section text", "plain_english_summary": "clear 2-3 sentence summary of what this section means for sellers", "category": "one of: account_integrity, intellectual_property, prohibited_items, handmade_reselling, fees_payments, community_conduct", "risk_level": "one of: low, medium, high, critical" }. Focus on practical implications for Etsy sellers.`;
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
    const { jobId, policyId } = await req.json();

    if (!jobId) {
      throw new Error('jobId is required');
    }

    // FINDER MODE: Find next policy to process
    if (!policyId) {
      console.log(`[FINDER] Finding next policy for job: ${jobId}`);
      
      // Check job status
      const { data: currentJob } = await supabase
        .from('policy_analysis_jobs')
        .select('status, policies_processed')
        .eq('id', jobId)
        .single();
      
      if (currentJob?.status === 'failed' || currentJob?.status === 'completed') {
        return new Response(JSON.stringify({
          success: false,
          completed: true,
          message: `Job is ${currentJob.status}`
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      // Clear sections only on first run
      if (!currentJob?.policies_processed || currentJob.policies_processed === 0) {
        await supabase.from('policy_sections').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }
      
      // Get all policies
      const { data: policies } = await supabase
        .from('etsy_policies')
        .select('id, category')
        .eq('is_active', true)
        .order('category');
      
      // Find first unprocessed policy (one with < 3 sections)
      for (const policy of policies) {
        const { data: sections } = await supabase
          .from('policy_sections')
          .select('id')
          .eq('policy_id', policy.id);
        
        if ((sections?.length || 0) < 3) {
          console.log(`[FINDER] Next policy: ${policy.category} (${sections?.length || 0} sections)`);
          return new Response(JSON.stringify({
            success: true,
            nextPolicyId: policy.id,
            policyCategory: policy.category,
            completed: false
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }
      
      // All done
      await supabase.from('policy_analysis_jobs').update({ 
        status: 'completed', 
        completed_at: new Date().toISOString(),
        progress_message: 'All policies processed!'
      }).eq('id', jobId);
      
      return new Response(JSON.stringify({
        success: true,
        completed: true,
        message: 'All policies processed!'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // WORKER MODE: Process specific policy
    console.log(`[WORKER] Processing policy: ${policyId}`);
    
    // Get current job data for tracking
    const { data: currentJob } = await supabase
      .from('policy_analysis_jobs')
      .select('policies_processed')
      .eq('id', jobId)
      .single();
    
    const { data: policy } = await supabase
      .from('etsy_policies')
      .select('content, category')
      .eq('id', policyId)
      .single();

    // Extract 3 sections only
    const lines = policy.content.split('\n');
    const sectionTitles = lines
      .filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 && 
               trimmed.length < 100 && 
               !trimmed.includes('©') &&
               !trimmed.includes('etsy.com');
      })
      .slice(0, 3); // Only 3 sections

    // Process sections
    for (let i = 0; i < sectionTitles.length; i++) {
      const sectionTitle = sectionTitles[i];
      const startIndex = lines.findIndex(line => line.includes(sectionTitle));
      const sectionContent = lines.slice(startIndex, startIndex + 8).join('\n').trim();
      
      // Generate hash
      const encoder = new TextEncoder();
      const data = encoder.encode(sectionContent);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Update progress
      await supabase.from('policy_analysis_jobs').update({
        progress_message: `Processing ${policy.category}: ${sectionTitle}`
      }).eq('id', jobId);

      let parsed;
      try {
        const aiResponse = await analyzeSection(sectionTitle, sectionContent, policy.category, openAIApiKey!);
        parsed = JSON.parse(repairJsonString(aiResponse));
      } catch (aiError) {
        parsed = {
          section_title: sectionTitle,
          section_content: sectionContent,
          plain_english_summary: `Analysis unavailable for ${sectionTitle}`,
          category: 'prohibited_items',
          risk_level: 'medium'
        };
      }

      // Insert section
      await supabase.from('policy_sections').insert({
        policy_id: policyId,
        section_title: parsed.section_title || sectionTitle,
        section_content: parsed.section_content || sectionContent,
        plain_english_summary: parsed.plain_english_summary || '',
        category: parsed.category || 'prohibited_items',
        risk_level: parsed.risk_level || 'medium',
        content_hash: contentHash,
        order_index: i + 1
      });
    }

    // Update policies processed count
    await supabase.from('policy_analysis_jobs').update({
      policies_processed: (currentJob?.policies_processed || 0) + 1
    }).eq('id', jobId);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Processed ${sectionTitles.length} sections for ${policy.category}` 
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('ERROR:', error.message);
    return new Response(JSON.stringify({ error: error.message, success: false }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});