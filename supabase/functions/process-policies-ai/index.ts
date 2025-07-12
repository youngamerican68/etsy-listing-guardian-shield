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

    console.log(`[SECTION MODE] Processing one section for job: ${jobId}`);
    
    // Check job status
    const { data: currentJob } = await supabase
      .from('policy_analysis_jobs')
      .select('status, sections_created')
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
    if (!currentJob?.sections_created || currentJob.sections_created === 0) {
      await supabase.from('policy_sections').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }
    
    // Get all policies and find one that needs more sections
    const { data: policies } = await supabase
      .from('etsy_policies')
      .select('id, category, content')
      .eq('is_active', true)
      .order('category');
    
    let targetPolicy = null;
    let sectionToProcess = null;
    
    // Find a policy that needs more sections (less than 3)
    for (const policy of policies) {
      const { data: sections } = await supabase
        .from('policy_sections')
        .select('id, section_title')
        .eq('policy_id', policy.id);
      
      if ((sections?.length || 0) < 3) {
        targetPolicy = policy;
        
        // Extract potential sections from content
        const lines = policy.content.split('\n');
        const sectionTitles = lines
          .filter(line => {
            const trimmed = line.trim();
            return trimmed.length > 10 && 
                   trimmed.length < 100 && 
                   !trimmed.includes('©') &&
                   !trimmed.includes('etsy.com');
          })
          .slice(0, 5);
        
        // Find a section that hasn't been processed yet
        const existingSectionTitles = sections?.map(s => s.section_title) || [];
        sectionToProcess = sectionTitles.find(title => 
          !existingSectionTitles.some(existing => existing.includes(title.substring(0, 20)))
        );
        
        if (sectionToProcess) break;
      }
    }
    
    // If no work to do, mark as completed
    if (!targetPolicy || !sectionToProcess) {
      await supabase.from('policy_analysis_jobs').update({ 
        status: 'completed', 
        completed_at: new Date().toISOString(),
        progress_message: 'All sections processed!'
      }).eq('id', jobId);
      
      return new Response(JSON.stringify({
        success: true,
        completed: true,
        message: 'All sections processed!'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Process just this one section
    console.log(`Processing section: ${sectionToProcess} from ${targetPolicy.category}`);
    
    const lines = targetPolicy.content.split('\n');
    const startIndex = lines.findIndex(line => line.includes(sectionToProcess));
    const sectionContent = lines.slice(startIndex, startIndex + 8).join('\n').trim();
    
    // Update progress
    await supabase.from('policy_analysis_jobs').update({
      progress_message: `Processing ${targetPolicy.category}: ${sectionToProcess}`
    }).eq('id', jobId);

    // Generate hash
    const encoder = new TextEncoder();
    const data = encoder.encode(sectionContent);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    let parsed;
    try {
      const aiResponse = await analyzeSection(sectionToProcess, sectionContent, targetPolicy.category, openAIApiKey!);
      parsed = JSON.parse(repairJsonString(aiResponse));
    } catch (aiError) {
      console.error('AI failed, using defaults:', aiError.message);
      parsed = {
        section_title: sectionToProcess,
        section_content: sectionContent,
        plain_english_summary: `Analysis unavailable for ${sectionToProcess}`,
        category: 'prohibited_items',
        risk_level: 'medium'
      };
    }

    // Insert section
    await supabase.from('policy_sections').insert({
      policy_id: targetPolicy.id,
      section_title: parsed.section_title || sectionToProcess,
      section_content: parsed.section_content || sectionContent,
      plain_english_summary: parsed.plain_english_summary || '',
      category: parsed.category || 'prohibited_items',
      risk_level: parsed.risk_level || 'medium',
      content_hash: contentHash,
      order_index: ((currentJob?.sections_created || 0) % 3) + 1
    });

    // Update sections count
    await supabase.from('policy_analysis_jobs').update({
      sections_created: (currentJob?.sections_created || 0) + 1
    }).eq('id', jobId);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Processed section: ${sectionToProcess}`,
      continue: true
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('ERROR:', error.message);
    return new Response(JSON.stringify({ error: error.message, success: false }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});