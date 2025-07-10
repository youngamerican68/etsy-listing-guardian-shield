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

// Function to split policy content into smaller, manageable chunks
function splitPolicyIntoChunks(content: string, maxChunkSize = 3000): string[] {
  // First try to split by clear section headers (numbered sections)
  let sections = content.split(/(?=\n\s*\d+\.\s+[A-Z])/);
  
  // If no numbered sections, try other common patterns
  if (sections.length === 1) {
    sections = content.split(/(?=\n\s*[A-Z][A-Z\s]+\n)|(?=\n\s*[A-Z][^.]*:\s*\n)/);
  }
  
  // If still no good splits, split by double newlines
  if (sections.length === 1) {
    sections = content.split(/\n\s*\n\s*(?=[A-Z])/);
  }
  
  const chunks = [];
  
  for (const section of sections) {
    const trimmedSection = section.trim();
    if (!trimmedSection) continue;
    
    if (trimmedSection.length <= maxChunkSize) {
      chunks.push(trimmedSection);
    } else {
      // Split large sections further by paragraphs
      const paragraphs = trimmedSection.split(/\n\s*\n/);
      let currentChunk = '';
      
      for (const paragraph of paragraphs) {
        if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = paragraph;
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        }
      }
      
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
    }
  }
  
  return chunks.length > 0 ? chunks : [content.substring(0, maxChunkSize)];
}

// Function to process a single chunk with AI
async function processChunkWithAI(chunk: string, chunkIndex: number, policyCategory: string, openAIApiKey: string): Promise<any> {
  console.log(`Processing chunk ${chunkIndex + 1} for policy: ${policyCategory}`);
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
          content: `You are an expert at analyzing Etsy's Terms of Service and policies. Analyze the given policy text section and extract structured information.

For each distinct rule or topic in the text, create a section with:
1. A clear, descriptive section title
2. The exact content/text for that section
3. A plain English summary (2-3 sentences max)
4. The category (account_integrity, intellectual_property, prohibited_items, handmade_reselling, fees_payments, or community_conduct)
5. Risk level (low, medium, high, critical) based on potential consequences for sellers
6. Extract 2-4 key prohibited terms/keywords with risk levels and context

CRITICAL: You must respond with ONLY a valid JSON object. No other text or formatting.

Example:
Input: "Policy Title: Handmade\n\nContent: All items on Etsy must be handmade by the seller..."
Output: { "sections": [ { "section_title": "Handmade Requirement", "section_content": "All items on Etsy must be handmade by the seller...", "plain_english_summary": "Sellers must personally create all items they list.", "category": "handmade_reselling", "risk_level": "high", "keywords": [{"keyword": "handmade", "risk_level": "high", "context": "Items must be personally made by seller"}] } ] }

Return JSON with this exact structure:
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
          content: `Policy Title: ${policyCategory}\n\nPolicy Content:\n${chunk}`
        }
      ],
      temperature: 0.2,
      max_tokens: 3000,
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Function to process policy with AI with retry mechanism and chunking (stateful version)
async function processWithAIRetryStateful(policy: any, openAIApiKey: string, policyId: string, supabase: any, maxRetries = 3): Promise<any> {
  console.log(`Starting stateful chunked processing for policy: ${policy.category}`);
  
  // Split the policy content into smaller chunks (increased size to reduce total chunks)
  const chunks = splitPolicyIntoChunks(policy.content, 5000);
  console.log(`Split policy into ${chunks.length} chunks`);
  
  const allSections = [];
  
  // Process all chunks in this run - no artificial limits
  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    
    // Process chunk with AI to get potential sections for checking
    let chunkSections = [];
    let shouldProcessChunk = false;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`AI processing attempt ${attempt} for chunk ${chunkIndex + 1}/${chunks.length} of policy: ${policy.category}`);
        
        const aiResponse = await processChunkWithAI(chunk, chunkIndex, policy.category, openAIApiKey);
        
        // Try to parse the response
        let parsedSections;
        try {
          // First attempt: direct parsing
          parsedSections = JSON.parse(aiResponse);
        } catch (parseError) {
          console.log(`JSON parse failed on attempt ${attempt} for chunk ${chunkIndex + 1}, trying repair...`);
          
          // Second attempt: repair and parse
          try {
            const repairedJson = repairJsonString(aiResponse);
            parsedSections = JSON.parse(repairedJson);
          } catch (repairError) {
            if (attempt === maxRetries) {
              console.error(`Final attempt failed for chunk ${chunkIndex + 1}. Original response:`, aiResponse);
              throw new Error(`Failed to parse AI response after ${maxRetries} attempts: ${repairError.message}`);
            }
            console.log(`Repair failed on attempt ${attempt} for chunk ${chunkIndex + 1}, retrying...`);
            continue;
          }
        }
        
        // Validate the structure
        if (!parsedSections.sections || !Array.isArray(parsedSections.sections)) {
          throw new Error(`Invalid response structure for chunk ${chunkIndex + 1}: missing sections array`);
        }
        
        console.log(`Successfully parsed AI response for chunk ${chunkIndex + 1} on attempt ${attempt}`);
        chunkSections = parsedSections.sections;
        
        // Now check if any of these sections already exist in the database
        const sectionsToProcess = [];
        for (const section of chunkSections) {
          // Check if this section already exists
          const { data: existingSection, error: checkError } = await supabase
            .from('policy_sections')
            .select('id')
            .eq('policy_id', policyId)
            .eq('section_title', section.section_title)
            .maybeSingle();
          
          if (checkError) {
            console.error(`Error checking existing section "${section.section_title}":`, checkError);
            // If there's an error checking, process the section to be safe
            sectionsToProcess.push(section);
          } else if (existingSection) {
            console.log(`Skipping already processed section: "${section.section_title}" for chunk ${chunkIndex + 1}`);
          } else {
            console.log(`Section "${section.section_title}" not found, will process`);
            sectionsToProcess.push(section);
          }
        }
        
        allSections.push(...sectionsToProcess);
        break; // Success, move to next chunk
        
      } catch (error) {
        if (attempt === maxRetries) {
          console.error(`All attempts failed for chunk ${chunkIndex + 1}:`, error.message);
          break;
        }
        console.log(`Attempt ${attempt} failed for chunk ${chunkIndex + 1}, retrying: ${error.message}`);
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  console.log(`Processed ${chunks.length} chunks for policy: ${policy.category}`);
  return { sections: allSections };
}

// Function to process policy with AI with retry mechanism and chunking (legacy version)
async function processWithAIRetry(policy: any, openAIApiKey: string, maxRetries = 3): Promise<any> {
  console.log(`Starting chunked processing for policy: ${policy.category}`);
  
  // Split the policy content into smaller chunks
  const chunks = splitPolicyIntoChunks(policy.content);
  console.log(`Split policy into ${chunks.length} chunks`);
  
  const allSections = [];
  
  // Process each chunk
  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`AI processing attempt ${attempt} for chunk ${chunkIndex + 1}/${chunks.length} of policy: ${policy.category}`);
        
        const aiResponse = await processChunkWithAI(chunk, chunkIndex, policy.category, openAIApiKey);
        
        // Try to parse the response
        let parsedSections;
        try {
          // First attempt: direct parsing
          parsedSections = JSON.parse(aiResponse);
        } catch (parseError) {
          console.log(`JSON parse failed on attempt ${attempt} for chunk ${chunkIndex + 1}, trying repair...`);
          
          // Second attempt: repair and parse
          try {
            const repairedJson = repairJsonString(aiResponse);
            parsedSections = JSON.parse(repairedJson);
          } catch (repairError) {
            if (attempt === maxRetries) {
              console.error(`Final attempt failed for chunk ${chunkIndex + 1}. Original response:`, aiResponse);
              throw new Error(`Failed to parse AI response after ${maxRetries} attempts: ${repairError.message}`);
            }
            console.log(`Repair failed on attempt ${attempt} for chunk ${chunkIndex + 1}, retrying...`);
            continue;
          }
        }
        
        // Validate the structure
        if (!parsedSections.sections || !Array.isArray(parsedSections.sections)) {
          throw new Error(`Invalid response structure for chunk ${chunkIndex + 1}: missing sections array`);
        }
        
        console.log(`Successfully parsed AI response for chunk ${chunkIndex + 1} on attempt ${attempt}`);
        allSections.push(...parsedSections.sections);
        break; // Success, move to next chunk
        
      } catch (error) {
        if (attempt === maxRetries) {
          console.error(`All attempts failed for chunk ${chunkIndex + 1}:`, error.message);
          // Continue with next chunk instead of failing completely
          break;
        }
        console.log(`Attempt ${attempt} failed for chunk ${chunkIndex + 1}, retrying: ${error.message}`);
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  return { sections: allSections };
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
    const { jobId } = await req.json();
    
    if (!jobId) {
      return new Response(JSON.stringify({ error: 'Job ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Update job status to running
    await supabase
      .from('policy_analysis_jobs')
      .update({
        status: 'running',
        progress_message: 'Starting policy processing',
        started_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log(`Starting policy processing for job: ${jobId}`);

    // Get existing policies from database instead of fetching from GitHub
    const { data: existingPolicies, error: policiesError } = await supabase
      .from('etsy_policies')
      .select('id, category, title, content, url')
      .eq('is_active', true);

    if (policiesError || !existingPolicies || existingPolicies.length === 0) {
      // If no policies exist, try to fetch from GitHub as fallback
      console.log('No policies found in database, attempting to fetch from GitHub...');
      
      const policiesResponse = await fetch('https://raw.githubusercontent.com/youngamerican68/etsy-listing-guardian-shield/main/policies.json');
      
      if (!policiesResponse.ok) {
        throw new Error(`No policies in database and failed to fetch from GitHub: ${policiesResponse.status}`);
      }
      
      const policiesData = await policiesResponse.json();
      const policies = Array.isArray(policiesData) ? policiesData : policiesData.policies || [];
      
      if (policies.length === 0) {
        throw new Error('No policies found');
      }
      
      // Store policies in database first
      for (const policy of policies) {
        await supabase
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
          });
      }
      
      // Re-fetch the stored policies
      const { data: storedPolicies } = await supabase
        .from('etsy_policies')
        .select('id, category, title, content, url')
        .eq('is_active', true);
      
      if (!storedPolicies || storedPolicies.length === 0) {
        throw new Error('Failed to store policies in database');
      }
      
      console.log(`Stored ${storedPolicies.length} policies in database`);
      existingPolicies.push(...storedPolicies);
    }

    // Find the first policy that doesn't have sections processed
    let policyToProcess = null;
    let processedCount = 0;
    
    for (const policy of existingPolicies) {
      const { data: existingSections } = await supabase
        .from('policy_sections')
        .select('id')
        .eq('policy_id', policy.id)
        .limit(1);
      
      if (existingSections && existingSections.length > 0) {
        processedCount++;
      } else if (!policyToProcess) {
        policyToProcess = policy;
      }
    }

    // Update job with total count
    await supabase
      .from('policy_analysis_jobs')
      .update({
        total_policies: existingPolicies.length,
        policies_processed: processedCount
      })
      .eq('id', jobId);

    // If all policies are processed, mark as complete
    if (!policyToProcess) {
      await supabase
        .from('policy_analysis_jobs')
        .update({
          status: 'completed',
          progress_message: 'All policies have been processed successfully',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'All policies already processed',
        jobId: jobId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Processing single policy: ${policyToProcess.category}`);

    // Update progress for the specific policy being processed
    await supabase
      .from('policy_analysis_jobs')
      .update({
        progress_message: `Processing policy: ${policyToProcess.category}`,
        policies_processed: processedCount
      })
      .eq('id', jobId);

    let totalSectionsCreated = 0;
    let totalKeywordsExtracted = 0;

    // Process the single policy with AI using retry mechanism with chunk-level checking
    const parsedSections = await processWithAIRetryStateful(policyToProcess, openAIApiKey, policyToProcess.id, supabase);

    // Store sections in database for this policy
    const processedSections = [];

    for (const [index, section] of parsedSections.sections.entries()) {
      // Insert policy section
      const { data: sectionData, error: sectionError } = await supabase
        .from('policy_sections')
        .insert({
          policy_id: policyToProcess.id,
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

      totalSectionsCreated++;

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
        } else {
          totalKeywordsExtracted += keywordInserts.length;
        }
      }

      processedSections.push({
        ...section,
        id: sectionData.id,
        keywords_count: section.keywords?.length || 0
      });
    }

    console.log(`Successfully processed ${processedSections.length} sections for policy ${policyToProcess.category}`);
    
    // Update final counts after processing this policy
    const finalProcessedCount = processedCount + 1;
    
    // Update job progress
    await supabase
      .from('policy_analysis_jobs')
      .update({
        policies_processed: finalProcessedCount,
        sections_created: totalSectionsCreated,
        keywords_extracted: totalKeywordsExtracted,
        progress_message: finalProcessedCount === existingPolicies.length 
          ? 'All policies have been processed successfully'
          : `Completed ${finalProcessedCount}/${existingPolicies.length} policies`
      })
      .eq('id', jobId);

    // Check if this was the last policy to mark job as completed
    if (finalProcessedCount === existingPolicies.length) {
      await supabase
        .from('policy_analysis_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);
    }

    console.log(`Job ${jobId} completed successfully`);

    return new Response(JSON.stringify({ 
      success: true,
      policies_processed: finalProcessedCount,
      sections_created: totalSectionsCreated,
      keywords_extracted: totalKeywordsExtracted,
      message: `Successfully processed 1 policy (${policyToProcess.category}), created ${totalSectionsCreated} sections, and extracted ${totalKeywordsExtracted} keywords.`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-policies-ai function:', error);
    
    // Mark job as failed if we have jobId
    const { jobId } = await req.json().catch(() => ({}));
    if (jobId) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await supabase
        .from('policy_analysis_jobs')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);
    }

    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});