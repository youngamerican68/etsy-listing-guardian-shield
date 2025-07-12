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

// Helper function to repair malformed JSON
function repairJsonString(jsonString: string): string {
  try {
    JSON.parse(jsonString);
    return jsonString;
  } catch {
    return jsonString
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      .replace(/([{,]\s*)(\w+):/g, '$1"$2":')
      .replace(/:\s*'([^']*)'/g, ':"$1"')
      .replace(/\\'/g, "'")
      .replace(/\n/g, '\\n');
  }
}

// Step A: Extract Table of Contents from policy
async function extractTableOfContents(policyContent: string, policyCategory: string, apiKey: string): Promise<string[]> {
  const prompt = `You are a legal document analyzer. Extract the exact section headings from this ${policyCategory} policy document.

Return only a clean JSON array of strings containing the exact section titles/headings as they appear in the document.

Example format: ["Introduction", "What You Can Sell", "Prohibited Items", "Listing Requirements"]

Policy content:
${policyContent.substring(0, 8000)}

IMPORTANT: Return ONLY the JSON array, no other text or formatting.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 1000,
    }),
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

// Step B: Analyze individual section
async function analyzeSection(sectionTitle: string, sectionContent: string, policyCategory: string, apiKey: string) {
  const prompt = `Analyze this specific section from Etsy's ${policyCategory} policy.

Section Title: ${sectionTitle}
Section Content: ${sectionContent}

Provide a JSON response with this structure:
{
  "section_title": "${sectionTitle}",
  "section_content": "full section text",
  "plain_english_summary": "clear 2-3 sentence summary of what this section means for sellers",
  "category": "one of: account_management, listing_requirements, prohibited_content, payment_fees, intellectual_property, community_guidelines, legal_terms",
  "risk_level": "one of: low, medium, high"
}

Focus on practical implications for Etsy sellers. Risk level should be "high" for sections that could result in account suspension, "medium" for policy violations with warnings, and "low" for general information.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 1500,
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// Find section content by title
function findSectionContent(policyContent: string, sectionTitle: string): string {
  const lines = policyContent.split('\n');
  let startIndex = -1;
  let endIndex = lines.length;

  // Find the start of this section
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(sectionTitle.toLowerCase()) || 
        lines[i].trim() === sectionTitle ||
        lines[i].includes(sectionTitle)) {
      startIndex = i;
      break;
    }
  }

  if (startIndex === -1) {
    // Try fuzzy matching
    for (let i = 0; i < lines.length; i++) {
      const similarity = calculateSimilarity(lines[i].toLowerCase(), sectionTitle.toLowerCase());
      if (similarity > 0.7) {
        startIndex = i;
        break;
      }
    }
  }

  if (startIndex === -1) {
    return `Section content for "${sectionTitle}" could not be located in the policy document.`;
  }

  // Find the end of this section (next heading or end of document)
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line && (
      line.match(/^[A-Z\s]+$/) ||  // All caps heading
      line.match(/^\d+\./) ||      // Numbered heading
      line.match(/^[A-Z][^.!?]*$/) // Title case heading
    ) && line.length < 100) {
      endIndex = i;
      break;
    }
  }

  return lines.slice(startIndex, endIndex).join('\n').trim();
}

// Simple string similarity calculation
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

// Continue processing (self-invoke for continuous execution)
async function continuePolicyProcessing(jobId: string) {
  try {
    console.log(`Attempting to continue processing for job ${jobId}...`);
    
    const response = await fetch(`${supabaseUrl}/functions/v1/process-policies-ai`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jobId, continueProcessing: true }),
    });

    if (!response.ok) {
      console.error('Failed to continue processing:', await response.text());
    } else {
      console.log('Successfully triggered continuation of processing');
    }
  } catch (error) {
    console.error('Error continuing processing:', error);
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
    const { jobId, continueProcessing = false } = await req.json();
    if (!jobId) {
      throw new Error('Job ID is required');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Update job status to running
    await supabase.from('policy_analysis_jobs').update({ 
      status: 'running', 
      progress_message: continueProcessing ? 'Continuing processing...' : 'Starting job...',
      started_at: new Date().toISOString()
    }).eq('id', jobId);

    // Get all policies
    const { data: policies } = await supabase.from('etsy_policies').select('*').eq('is_active', true);
    if (!policies || policies.length === 0) {
      throw new Error('No active policies found in the database to process.');
    }

    // Update total policies count
    await supabase.from('policy_analysis_jobs').update({ 
      total_policies: policies.length 
    }).eq('id', jobId);

    let processedCount = 0;
    let totalSectionsCreated = 0;

    for (const policy of policies) {
      // Check if policy is already completely processed
      const { data: existingSections, error: checkError } = await supabase
        .from('policy_sections')
        .select('id', { count: 'exact' })
        .eq('policy_id', policy.id);

      // Consider a policy processed if it has more than 3 sections (robust threshold)
      if (!checkError && existingSections && existingSections.length > 3) {
        console.log(`Policy ${policy.category} already processed with ${existingSections.length} sections. Skipping.`);
        processedCount++;
        continue;
      }

      // If policy has fewer sections, clean it up and reprocess
      if (existingSections && existingSections.length > 0) {
        console.log(`Policy ${policy.category} has only ${existingSections.length} sections. Cleaning up and reprocessing...`);
        await supabase.from('policy_sections').delete().eq('policy_id', policy.id);
      }

      await supabase.from('policy_analysis_jobs').update({ 
        progress_message: `Extracting table of contents for: ${policy.category}` 
      }).eq('id', jobId);

      // Step A: Extract Table of Contents
      const sectionTitles = await extractTableOfContents(policy.content, policy.category, openAIApiKey);
      console.log(`Extracted ${sectionTitles.length} section titles for ${policy.category}`);

      if (sectionTitles.length === 0) {
        console.log(`No sections found for ${policy.category}, skipping...`);
        processedCount++;
        continue;
      }

      // Step B: Process each section individually
      let sectionCount = 0;
      for (const sectionTitle of sectionTitles) {
        sectionCount++;
        
        await supabase.from('policy_analysis_jobs').update({ 
          progress_message: `Processing section ${sectionCount}/${sectionTitles.length} of ${policy.category}: ${sectionTitle}` 
        }).eq('id', jobId);

        // Find the section content
        const sectionContent = findSectionContent(policy.content, sectionTitle);
        
        // Generate content hash for deduplication
        const contentHash = await generateHash(sectionContent);

        // Check if this exact content was already processed
        const { data: existingSection } = await supabase
          .from('policy_sections')
          .select('id')
          .eq('content_hash', contentHash)
          .maybeSingle();

        if (existingSection) {
          console.log(`Section "${sectionTitle}" already processed (hash: ${contentHash.substring(0, 12)})`);
          continue;
        }

        try {
          // Step B: Analyze this specific section
          const aiResponse = await analyzeSection(sectionTitle, sectionContent, policy.category, openAIApiKey);
          const parsed = JSON.parse(repairJsonString(aiResponse));

          // Insert the processed section
          const { error: insertError } = await supabase.from('policy_sections').insert({
            policy_id: policy.id,
            section_title: parsed.section_title || sectionTitle,
            section_content: parsed.section_content || sectionContent,
            plain_english_summary: parsed.plain_english_summary || '',
            category: parsed.category || 'general',
            risk_level: parsed.risk_level || 'medium',
            content_hash: contentHash,
            order_index: sectionCount
          });

          if (insertError) {
            if (insertError.code === '23505') {
              console.log(`Duplicate section skipped: "${sectionTitle}"`);
            } else {
              console.error(`Error inserting section "${sectionTitle}":`, insertError);
              // Continue processing other sections despite errors
            }
          } else {
            totalSectionsCreated++;
            console.log(`Successfully processed section: "${sectionTitle}"`);
          }

        } catch (error) {
          console.error(`Failed to process section "${sectionTitle}":`, error);
          // Continue with next section
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      processedCount++;
      
      // Update progress
      await supabase.from('policy_analysis_jobs').update({ 
        progress_message: `Completed processing for: ${policy.category}`, 
        policies_processed: processedCount,
        sections_created: totalSectionsCreated
      }).eq('id', jobId);

      console.log(`Completed policy ${policy.category} with ${sectionCount} sections`);
    }

    // Check if all policies are processed
    if (processedCount >= policies.length) {
      await supabase.from('policy_analysis_jobs').update({ 
        status: 'completed', 
        progress_message: `All policies processed successfully. Created ${totalSectionsCreated} sections.`,
        completed_at: new Date().toISOString(),
        sections_created: totalSectionsCreated
      }).eq('id', jobId);

      console.log('All policies processing completed successfully');
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: `All policies processed. Created ${totalSectionsCreated} sections.` 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // Continue processing remaining work
      console.log(`Processed ${processedCount}/${policies.length} policies. Continuing...`);
      
      // Self-invoke to continue processing (autonomous execution)
      EdgeRuntime.waitUntil(continuePolicyProcessing(jobId));
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: `Batch completed. Continuing with remaining policies...`,
        processed: processedCount,
        total: policies.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Critical error in process-policies-ai function:', error);
    
    try {
      const { jobId } = await req.json().catch(() => ({}));
      if (jobId) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase.from('policy_analysis_jobs').update({ 
          status: 'failed', 
          error_message: error.message,
          completed_at: new Date().toISOString()
        }).eq('id', jobId);
      }
    } catch (updateError) {
      console.error('Failed to update job status on error:', updateError);
    }
    
    return new Response(JSON.stringify({ error: error.message, success: false }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});