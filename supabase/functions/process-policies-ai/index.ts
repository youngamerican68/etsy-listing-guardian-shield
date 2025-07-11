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

// Helper function to generate SHA-256 hash
async function generateHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ... (Other helper functions like repairJsonString, splitPolicyIntoChunks remain the same) ...
// NOTE: For brevity, I'm omitting the identical helper functions. The main change is in the 'serve' function.

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
    const { jobId } = await req.json();
    if (!jobId) {
      throw new Error('Job ID is required');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    await supabase.from('policy_analysis_jobs').update({ status: 'running', progress_message: 'Starting job...' }).eq('id', jobId);

    const { data: policies } = await supabase.from('etsy_policies').select('*').eq('is_active', true);
    if (!policies || policies.length === 0) {
      throw new Error('No active policies found in the database to process.');
    }

    let processedCount = 0;
    for (const policy of policies) {
        const { data: existingSections, error: checkError } = await supabase
            .from('policy_sections')
            .select('id', { count: 'exact' })
            .eq('policy_id', policy.id);

        if (checkError) {
            console.error(`Could not check for existing sections for policy ${policy.category}, reprocessing.`);
        } else if (existingSections && existingSections.length > 0) {
            console.log(`Policy ${policy.category} has already been processed with ${existingSections.length} sections. Skipping.`);
            processedCount++;
            continue;
        }

        await supabase.from('policy_analysis_jobs').update({ progress_message: `Processing policy: ${policy.category}` }).eq('id', jobId);
        
        const chunks = splitPolicyIntoChunks(policy.content);
        console.log(`Split policy ${policy.category} into ${chunks.length} chunks.`);

        for (const chunk of chunks) {
            const contentHash = await generateHash(chunk);

            const { data: existingChunk } = await supabase
                .from('policy_sections')
                .select('id')
                .eq('content_hash', contentHash)
                .maybeSingle();

            if (existingChunk) {
                console.log(`Skipping already processed chunk with hash: ${contentHash.substring(0, 12)}...`);
                continue;
            }

            try {
                const aiResponse = await processChunkWithAI(chunk, policies.indexOf(policy), policy.category, openAIApiKey);
                const parsed = JSON.parse(repairJsonString(aiResponse));

                if (parsed.sections && Array.isArray(parsed.sections)) {
                    for (const section of parsed.sections) {
                        const sectionHash = await generateHash(section.section_content);
                        const { error: insertError } = await supabase.from('policy_sections').insert({
                            policy_id: policy.id,
                            section_title: section.section_title,
                            section_content: section.section_content,
                            plain_english_summary: section.plain_english_summary,
                            category: section.category,
                            risk_level: section.risk_level,
                            content_hash: sectionHash,
                        });

                        // #############################################################
                        // ### START OF THE REVISED CODE BLOCK ###
                        // #############################################################
                        if (insertError) {
                            if (insertError.code === '23505') {
                                // This is an expected error for duplicate content, not a critical failure.
                                console.log(`LOG: Duplicate section found and skipped: "${section.section_title}"`);
                            } else {
                                // This is an unexpected database error that should be logged.
                                console.error(`Error inserting section "${section.section_title}":`, insertError);
                            }
                        }
                        // #############################################################
                        // ### END OF THE REVISED CODE BLOCK ###
                        // #############################################################
                    }
                }
            } catch (error) {
                console.error(`Failed to process chunk for policy ${policy.category}:`, error);
            }
        }
        processedCount++;
        await supabase.from('policy_analysis_jobs').update({ progress_message: `Completed processing for: ${policy.category}`, policies_processed: processedCount }).eq('id', jobId);
    }

    await supabase.from('policy_analysis_jobs').update({ status: 'completed', progress_message: 'All policies processed successfully.', completed_at: new Date().toISOString() }).eq('id', jobId);

    return new Response(JSON.stringify({ success: true, message: 'All policies processed.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Critical error in process-policies-ai function:', error);
    const { jobId } = await req.json().catch(() => ({}));
    if (jobId) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase.from('policy_analysis_jobs').update({ status: 'failed', error_message: error.message }).eq('id', jobId);
    }
    return new Response(JSON.stringify({ error: error.message, success: false }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// NOTE: The helper functions `repairJsonString`, `splitPolicyIntoChunks`, and `processChunkWithAI`
// are assumed to be defined above this `serve` function as they were in the previous version.
// Their implementation does not need to change.