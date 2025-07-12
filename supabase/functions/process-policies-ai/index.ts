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
    const { jobId } = await req.json();

    if (!jobId) {
      throw new Error('jobId is required');
    }

    console.log(`[SIMPLE MODE] Processing all policies for job: ${jobId}`);
    
    // Check if job is still active
    const { data: currentJob } = await supabase
      .from('policy_analysis_jobs')
      .select('status')
      .eq('id', jobId)
      .single();
    
    if (currentJob?.status === 'failed' || currentJob?.status === 'completed') {
      console.log(`Job ${jobId} is ${currentJob.status}, stopping execution`);
      return new Response(JSON.stringify({
        success: false,
        completed: true,
        message: `Job has been ${currentJob.status}`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Clear existing sections for fresh start
    console.log('Clearing existing sections for fresh start...');
    await supabase.from('policy_sections').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Get all active policies
    const { data: policies, error: policiesError } = await supabase
      .from('etsy_policies')
      .select('id, category, content')
      .eq('is_active', true);
    
    if (policiesError) throw policiesError;

    console.log(`Found ${policies.length} policies to process`);
    
    // Process each policy completely
    for (let policyIndex = 0; policyIndex < policies.length; policyIndex++) {
      const policy = policies[policyIndex];
      console.log(`Processing policy ${policyIndex + 1}/${policies.length}: ${policy.category}`);
      
      // Update job progress
      await supabase.from('policy_analysis_jobs').update({
        progress_message: `Processing policy ${policyIndex + 1}/${policies.length}: ${policy.category}`,
        policies_processed: policyIndex
      }).eq('id', jobId);

      // Extract sections from policy content
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
        continue;
      }

      // Process each section of this policy
      for (let i = 0; i < sectionTitles.length; i++) {
        const sectionTitle = sectionTitles[i];
        console.log(`  Processing section ${i + 1}/${sectionTitles.length}: ${sectionTitle}`);
        
        // Find section content
        const startIndex = lines.findIndex(line => line.includes(sectionTitle));
        const endIndex = startIndex + 10;
        const sectionContent = lines.slice(startIndex, endIndex).join('\n').trim();
        
        // Generate content hash
        const encoder = new TextEncoder();
        const data = encoder.encode(sectionContent);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        let parsed;
        try {
          // Call OpenAI to analyze the section
          const aiResponse = await analyzeSection(sectionTitle, sectionContent, policy.category, openAIApiKey!);
          parsed = JSON.parse(repairJsonString(aiResponse));
        } catch (aiError) {
          console.error(`AI processing failed for section "${sectionTitle}":`, aiError.message);
          parsed = {
            section_title: sectionTitle,
            section_content: sectionContent,
            plain_english_summary: `Analysis unavailable for ${sectionTitle}`,
            category: 'prohibited_items',
            risk_level: 'medium'
          };
        }

        // Insert the processed section
        const { error: insertError } = await supabase.from('policy_sections').insert({
          policy_id: policy.id,
          section_title: parsed.section_title || sectionTitle,
          section_content: parsed.section_content || sectionContent,
          plain_english_summary: parsed.plain_english_summary || '',
          category: parsed.category || 'prohibited_items',
          risk_level: parsed.risk_level || 'medium',
          content_hash: contentHash,
          order_index: i + 1
        });

        if (insertError && insertError.code !== '23505') {
          throw insertError;
        }
      }
    }

    // Mark job as completed
    console.log('All policies processed successfully!');
    await supabase.from('policy_analysis_jobs').update({ 
      status: 'completed', 
      completed_at: new Date().toISOString(),
      progress_message: 'All policies processed successfully!',
      policies_processed: policies.length
    }).eq('id', jobId);
    
    return new Response(JSON.stringify({
      success: true,
      completed: true,
      message: `Successfully processed ${policies.length} policies`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('CRITICAL ERROR:', error.message);
    const body = await req.json().catch(() => ({}));
    const { jobId } = body;
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