// supabase/functions/process-policies-ai/index.ts
// CORRECTED AND SIMPLIFIED LOGIC

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- Environment Variables and Headers ---
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Helper Functions (generateHash, repairJsonString, etc.) ---
// These are correct, no changes needed here.
async function generateHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function repairJsonString(jsonString: string): string {
  try {
    JSON.parse(jsonString);
    return jsonString;
  } catch {
    return jsonString.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']').replace(/([{,]\s*)(\w+):/g, '$1"$2":').replace(/:\s*'([^']*)'/g, ':"$1"').replace(/\\'/g, "'").replace(/\n/g, '\\n');
  }
}

async function extractTableOfContents(policyContent: string, policyCategory: string, apiKey: string): Promise<string[]> {
  const prompt = `You are a legal document analyzer. Extract the exact section headings from this ${policyCategory} policy document. Return only a clean JSON array of strings containing the exact section titles/headings as they appear in the document. Example format: ["Introduction", "What You Can Sell", "Prohibited Items", "Listing Requirements"]. Policy content: ${policyContent.substring(0, 8000)}. IMPORTANT: Return ONLY the JSON array, no other text or formatting.`;
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.1, max_tokens: 1000 }),
  });
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '[]';
  try {
    return JSON.parse(repairJsonString(content));
  } catch (error) {
    console.error('Failed to parse table of contents:', error);
    return [];
  }
}

async function analyzeSection(sectionTitle: string, sectionContent: string, policyCategory: string, apiKey: string) {
  const prompt = `Analyze this specific section from Etsy's ${policyCategory} policy. Section Title: ${sectionTitle}. Section Content: ${sectionContent}. Provide a JSON response with this structure: { "section_title": "${sectionTitle}", "section_content": "full section text", "plain_english_summary": "clear 2-3 sentence summary of what this section means for sellers", "category": "one of: account_management, listing_requirements, prohibited_content, payment_fees, intellectual_property, community_guidelines, legal_terms", "risk_level": "one of: low, medium, high" }. Focus on practical implications for Etsy sellers. Risk level should be "high" for sections that could result in account suspension, "medium" for policy violations with warnings, and "low" for general information.`;
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.2, max_tokens: 1500 }),
  });
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

function findSectionContent(policyContent: string, sectionTitle: string): string {
  const lines = policyContent.split('\n');
  let startIndex = -1, endIndex = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(sectionTitle.toLowerCase()) || lines[i].trim() === sectionTitle || lines[i].includes(sectionTitle)) {
      startIndex = i;
      break;
    }
  }
  if (startIndex === -1) return `Section content for "${sectionTitle}" could not be located.`;
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line && (line.match(/^[A-Z\s]+$/) || line.match(/^\d+\./) || line.match(/^[A-Z][^.!?]*$/)) && line.length < 100) {
      endIndex = i;
      break;
    }
  }
  return lines.slice(startIndex, endIndex).join('\n').trim();
}

// --- Main Server Logic ---
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!openAIApiKey) {
    return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { jobId, policyId } = await req.json();
  
  if (!jobId) {
    return new Response(JSON.stringify({ error: 'Job ID is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    if (policyId) {
      // --- WORKER MODE: Process ONE ENTIRE policy ---
      console.log(`WORKER MODE: Starting to process policy ${policyId} for job ${jobId}`);
      
      const { data: policy, error: policyError } = await supabase.from('etsy_policies').select('*').eq('id', policyId).single();
      if (policyError || !policy) throw new Error(`Policy not found: ${policyId}`);

      await supabase.from('policy_analysis_jobs').update({ status: 'running', progress_message: `Processing policy: ${policy.category}...` }).eq('id', jobId);

      // Clean up old sections for this policy to allow reprocessing
      await supabase.from('policy_sections').delete().eq('policy_id', policy.id);

      // Extract Table of Contents ONCE
      const sectionTitles = await extractTableOfContents(policy.content, policy.category, openAIApiKey);
      console.log(`Found ${sectionTitles.length} sections for ${policy.category}.`);

      let sectionsCreated = 0;
      // Loop through all sections and process them
      for (let i = 0; i < sectionTitles.length; i++) {
        const sectionTitle = sectionTitles[i];
        console.log(`Processing section ${i + 1}/${sectionTitles.length}: ${sectionTitle}`);
        await supabase.from('policy_analysis_jobs').update({ progress_message: `Processing section ${i + 1}/${sectionTitles.length} of ${policy.category}` }).eq('id', jobId);
        
        const sectionContent = findSectionContent(policy.content, sectionTitle);
        const contentHash = await generateHash(sectionContent);

        try {
          const aiResponse = await analyzeSection(sectionTitle, sectionContent, policy.category, openAIApiKey);
          const parsed = JSON.parse(repairJsonString(aiResponse));

          await supabase.from('policy_sections').insert({
            policy_id: policy.id,
            section_title: parsed.section_title || sectionTitle,
            section_content: parsed.section_content || sectionContent,
            plain_english_summary: parsed.plain_english_summary || '',
            category: parsed.category || 'general',
            risk_level: parsed.risk_level || 'medium',
            content_hash: contentHash,
            order_index: i + 1
          });
          sectionsCreated++;
        } catch (error) {
          console.error(`Failed to process section "${sectionTitle}":`, error);
        }
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between sections
      }

      return new Response(JSON.stringify({ success: true, message: `Processed ${sectionsCreated} sections for policy ${policy.category}.` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } else {
      // --- FINDER MODE: Find the NEXT policy to process ---
      console.log(`FINDER MODE: Looking for next policy for job ${jobId}`);

      const { data: policies } = await supabase.from('etsy_policies').select('id, category').eq('is_active', true);
      if (!policies) throw new Error('No active policies found.');
      
      let policyToProcess = null;
      for (const policy of policies) {
        const { count } = await supabase.from('policy_sections').select('id', { count: 'exact', head: true }).eq('policy_id', policy.id);
        if (count === null || count < 3) {
          policyToProcess = policy;
          break;
        }
      }

      if (!policyToProcess) {
        // All policies are done
        await supabase.from('policy_analysis_jobs').update({ status: 'completed', progress_message: 'All policies processed successfully.', completed_at: new Date().toISOString() }).eq('id', jobId);
        return new Response(JSON.stringify({ success: true, completed: true, message: 'All policies are processed.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ success: true, completed: false, nextPolicyId: policyToProcess.id, policyCategory: policyToProcess.category }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  } catch (error) {
    console.error('CRITICAL ERROR:', error.message);
    await supabase.from('policy_analysis_jobs').update({ status: 'failed', error_message: error.message, completed_at: new Date().toISOString() }).eq('id', jobId);
    return new Response(JSON.stringify({ error: error.message, success: false }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});