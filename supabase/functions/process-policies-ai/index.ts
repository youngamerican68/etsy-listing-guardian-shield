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
  let body: any = {};
  
  try {
    body = await req.json();
    const { jobId, policyId } = body;

    if (!jobId) {
      throw new Error('jobId is required');
    }

    // FINDER MODE: If only jobId is provided, find the next section to process
    if (!policyId) {
      console.log(`[FINDER MODE] Finding next section for job: ${jobId}`);
      
      // First time running this job? Clear any existing sections for a fresh start
      const { data: jobData } = await supabase
        .from('policy_analysis_jobs')
        .select('started_at, policies_processed')
        .eq('id', jobId)
        .single();
      
      if (jobData && (!jobData.policies_processed || jobData.policies_processed === 0)) {
        console.log('[FINDER MODE] Clearing existing sections for fresh start...');
        await supabase.from('policy_sections').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }
      
      // Get all active policies
      const { data: policies, error: policiesError } = await supabase
        .from('etsy_policies')
        .select('id, category, content')
        .eq('is_active', true);
      
      if (policiesError) throw policiesError;

      // Find the first policy that has few or no sections processed
      for (const policy of policies) {
        const { count } = await supabase
          .from('policy_sections')
          .select('id', { count: 'exact', head: true })
          .eq('policy_id', policy.id);
        
        // If this policy has less than 3 sections, it needs processing
        if (!count || count < 3) {
          console.log(`[FINDER MODE] Found policy to process: ${policy.category}`);
          return new Response(JSON.stringify({
            success: true,
            nextPolicyId: policy.id,
            policyCategory: policy.category,
            completed: false
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
      
      // If we get here, all policies are processed
      console.log(`[FINDER MODE] All policies completed for job: ${jobId}`);
      await supabase.from('policy_analysis_jobs').update({ 
        status: 'completed', 
        completed_at: new Date().toISOString(),
        progress_message: 'All policies processed successfully!'
      }).eq('id', jobId);
      
      return new Response(JSON.stringify({
        success: true,
        completed: true,
        message: 'All policies have been processed!'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // WORKER MODE: If policyId is provided, process that specific policy
    if (jobId && policyId) {
      console.log(`[WORKER MODE] Processing policy: ${policyId}`);
      
      // Get the policy content
      const { data: policy, error: policyError } = await supabase
        .from('etsy_policies')
        .select('content, category')
        .eq('id', policyId)
        .single();
      
      if (policyError) throw policyError;

      // Extract table of contents using simple text parsing
      const lines = policy.content.split('\n');
      const sectionTitles = lines
        .filter(line => {
          const trimmed = line.trim();
          return trimmed.length > 0 && 
                 trimmed.length < 100 && 
                 (trimmed.match(/^[A-Z]/) || trimmed.match(/^\d+\./)) &&
                 !trimmed.includes('©') &&
                 !trimmed.includes('etsy.com');
        })
        .slice(0, 5); // Limit to first 5 sections

      if (sectionTitles.length === 0) {
        console.warn(`No sections found for policy: ${policy.category}`);
        return new Response(JSON.stringify({
          success: true,
          message: `No processable sections found for ${policy.category}`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Process each section
      let processedSections = 0;
      for (let i = 0; i < sectionTitles.length; i++) {
        const sectionTitle = sectionTitles[i];
        
        // Find section content
        const startIndex = lines.findIndex(line => line.includes(sectionTitle));
        const endIndex = startIndex + 10; // Take next 10 lines as content
        const sectionContent = lines.slice(startIndex, endIndex).join('\n').trim();
        
        // Generate content hash
        const encoder = new TextEncoder();
        const data = encoder.encode(sectionContent);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Update job progress
        await supabase.from('policy_analysis_jobs').update({
          progress_message: `Processing ${policy.category}: ${sectionTitle} (${i + 1}/${sectionTitles.length})`
        }).eq('id', jobId);

        let parsed;
        try {
          // Call OpenAI to analyze the section
          console.log(`Calling OpenAI for section: ${sectionTitle}`);
          const aiResponse = await analyzeSection(sectionTitle, sectionContent, policy.category, openAIApiKey!);
          console.log(`OpenAI raw response: ${aiResponse.substring(0, 200)}...`);
          
          parsed = JSON.parse(repairJsonString(aiResponse));
          console.log(`Parsed successfully: ${JSON.stringify(parsed).substring(0, 100)}...`);
        } catch (aiError) {
          console.error(`AI processing failed for section "${sectionTitle}":`, aiError.message);
          // Continue with default values if AI fails
          parsed = {
            section_title: sectionTitle,
            section_content: sectionContent,
            plain_english_summary: `Analysis unavailable for ${sectionTitle}`,
            category: 'general',
            risk_level: 'medium'
          };
        }

        // Insert the processed section into the database
        const { error: insertError } = await supabase.from('policy_sections').insert({
          policy_id: policyId,
          section_title: parsed.section_title || sectionTitle,
          section_content: parsed.section_content || sectionContent,
          plain_english_summary: parsed.plain_english_summary || '',
          category: parsed.category || 'general',
          risk_level: parsed.risk_level || 'medium',
          content_hash: contentHash,
          order_index: i + 1
        });

        if (insertError && insertError.code !== '23505') {
          throw insertError;
        }
        
        processedSections++;
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Successfully processed ${processedSections} sections for ${policy.category}` 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid request: must provide either jobId only (finder mode) or jobId + policyId (worker mode)');

  } catch (error) {
    console.error('CRITICAL ERROR:', error.message);
    const { jobId } = body || {};
    if (jobId) {
      await supabase.from('policy_analysis_jobs').update({ 
        status: 'failed', 
        error_message: error.message 
      }).eq('id', jobId);
    }
    return new Response(JSON.stringify({ error: error.message, success: false }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});