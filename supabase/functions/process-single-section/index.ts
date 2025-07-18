// Background Policy Processing Function
// Processes ONE section per invocation - designed for cron jobs
// File: supabase/functions/process-single-section/index.ts
// Version: 2.0 - Fixed section matching logic

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

// Helper to repair JSON responses from OpenAI
function repairJsonString(jsonString: string): string {
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

// Calculate similarity between two strings using Levenshtein distance
function calculateSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;
  
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null));
  
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  const maxLen = Math.max(len1, len2);
  return (maxLen - matrix[len1][len2]) / maxLen;
}

// OpenAI analysis function
async function analyzeSection(sectionTitle: string, sectionContent: string, policyCategory: string, apiKey: string) {
  const prompt = `Analyze this Etsy policy section. Focus on compliance implications for sellers.

Policy Category: ${policyCategory}
Section Title: ${sectionTitle}
Section Content: ${sectionContent}

Return JSON with this exact structure:
{
  "section_title": "${sectionTitle}",
  "section_content": "full section text",
  "plain_english_summary": "2-3 sentence summary of what this means for Etsy sellers",
  "category": "one of: account_integrity, intellectual_property, prohibited_items, handmade_reselling, fees_payments, community_conduct",
  "risk_level": "one of: low, medium, high, critical"
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${apiKey}`, 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({ 
      model: 'gpt-4o-mini', 
      messages: [{ role: 'user', content: prompt }], 
      temperature: 0.2, 
      max_tokens: 1500 
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API failed: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// Main processing function
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const startTime = Date.now();
  
  try {
    console.log('🚀 Background processing: Finding next section to process...');

    // Update status to show we're active
    await supabase.rpc('update_processing_status', {
      p_active: true
    });

    // Get all active policies
    const { data: policies } = await supabase
      .from('etsy_policies')
      .select('id, category, content, title')
      .eq('is_active', true)
      .order('category');

    if (!policies || policies.length === 0) {
      console.log('❌ No active policies found');
      await supabase.rpc('update_processing_status', { p_active: false });
      return new Response(JSON.stringify({ success: false, message: 'No policies found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Find a section that needs AI processing
    let targetPolicy = null;
    let sectionToProcess = null;

    for (const policy of policies) {
      // First check if there are any existing sections without AI summaries
      const { data: unprocessedSections } = await supabase
        .from('policy_sections')
        .select('id, section_title, plain_english_summary')
        .eq('policy_id', policy.id)
        .is('plain_english_summary', null);

      console.log(`🔍 Policy ${policy.category}: Found ${unprocessedSections?.length || 0} unprocessed sections`);

      if (unprocessedSections && unprocessedSections.length > 0) {
        // Process an existing section that lacks AI summary
        const sectionToUpdate = unprocessedSections[0];
        console.log(`🔄 Found existing section without AI summary: "${sectionToUpdate.section_title}"`);
        
        // Update the existing section instead of creating a new one
        targetPolicy = policy;
        sectionToProcess = sectionToUpdate.section_title;
        break;
      }

      // If no unprocessed sections, check if we need to add new sections
      const { data: existingSections } = await supabase
        .from('policy_sections')
        .select('section_title')
        .eq('policy_id', policy.id);

      const existingCount = existingSections?.length || 0;
      
      // If this policy has less than 100 sections, find a new section to process
      if (existingCount < 100) {
        // Extract potential sections from policy content
        const lines = policy.content.split('\n');
        const potentialSections = lines
          .filter(line => {
            const trimmed = line.trim();
            return trimmed.length > 15 && 
                   trimmed.length < 200 && 
                   !trimmed.includes('©') &&
                   !trimmed.includes('http') &&
                   !trimmed.toLowerCase().includes('etsy') &&
                   (trimmed.includes('.') || trimmed.includes(':') || /^[A-Z]/.test(trimmed));
          })
          .slice(0, 50); // Get up to 50 potential sections

        // Find a section we haven't processed yet
        const existingTitles = existingSections?.map(s => s.section_title) || [];
        sectionToProcess = potentialSections.find(section => {
          const sectionNormalized = section.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
          
          return !existingTitles.some(existing => {
            const existingNormalized = existing.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
            
            // Check for exact match after normalization
            if (existingNormalized === sectionNormalized) return true;
            
            // Only check similarity if both strings are reasonably long
            if (sectionNormalized.length < 10 || existingNormalized.length < 10) return false;
            
            // Check for substantial overlap (90% similarity for stricter matching)
            const similarity = calculateSimilarity(existingNormalized, sectionNormalized);
            return similarity > 0.9;
          });
        });

        if (sectionToProcess) {
          targetPolicy = policy;
          break;
        }
      }
    }

    // If no work to do, mark as inactive
    if (!targetPolicy || !sectionToProcess) {
      console.log('✅ All policies fully processed!');
      await supabase.rpc('update_processing_status', { 
        p_active: false,
        p_error: null
      });
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'All policies processed',
        completed: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📝 Processing: "${sectionToProcess}" from ${targetPolicy.category}`);

    // Update status with current processing info
    await supabase.rpc('update_processing_status', {
      p_policy_id: targetPolicy.id,
      p_policy_category: targetPolicy.category,
      p_section_title: sectionToProcess,
      p_active: true
    });

    // Log processing start
    const { data: logEntry } = await supabase
      .from('policy_processing_log')
      .insert({
        policy_id: targetPolicy.id,
        section_title: sectionToProcess,
        status: 'started'
      })
      .select('id')
      .single();

    // Extract section content (get surrounding context)
    const lines = targetPolicy.content.split('\n');
    const startIndex = lines.findIndex(line => line.includes(sectionToProcess));
    const sectionContent = lines.slice(
      Math.max(0, startIndex), 
      Math.min(lines.length, startIndex + 10)
    ).join('\n').trim();

    // Generate content hash for deduplication (include section title for uniqueness)
    const encoder = new TextEncoder();
    const uniqueContent = `${sectionToProcess}::${sectionContent}`;
    const data = encoder.encode(uniqueContent);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    let aiAnalysis;
    let aiTokensUsed = 0;

    try {
      // Call OpenAI for analysis
      const aiResponse = await analyzeSection(
        sectionToProcess, 
        sectionContent, 
        targetPolicy.category, 
        openAIApiKey!
      );
      
      aiAnalysis = JSON.parse(repairJsonString(aiResponse));
      aiTokensUsed = Math.ceil(aiResponse.length / 4); // Rough token estimate
      
      console.log('🤖 AI analysis successful');
      
    } catch (aiError) {
      console.error('🚨 AI analysis failed:', aiError.message);
      
      // Create fallback analysis
      aiAnalysis = {
        section_title: sectionToProcess,
        section_content: sectionContent,
        plain_english_summary: `This section covers ${sectionToProcess.toLowerCase()}. AI analysis was unavailable, please review manually.`,
        category: 'prohibited_items', // Safe default
        risk_level: 'medium' // Safe default
      };

      // Log the AI failure
      await supabase
        .from('policy_processing_log')
        .update({
          status: 'failed',
          error_message: `AI failed: ${aiError.message}`,
          processing_time_ms: Date.now() - startTime
        })
        .eq('id', logEntry.id);

      await supabase.rpc('update_processing_status', {
        p_error: `AI failed: ${aiError.message}`,
        p_active: false
      });

      return new Response(JSON.stringify({ 
        success: false, 
        error: aiError.message 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if we're updating an existing section or inserting a new one
    const { data: existingSection } = await supabase
      .from('policy_sections')
      .select('id')
      .eq('policy_id', targetPolicy.id)
      .eq('section_title', sectionToProcess)
      .single();

    if (existingSection) {
      // Update existing section with AI analysis
      const { error: updateError } = await supabase
        .from('policy_sections')
        .update({
          plain_english_summary: aiAnalysis.plain_english_summary,
          category: aiAnalysis.category,
          risk_level: aiAnalysis.risk_level,
          content_hash: contentHash
        })
        .eq('id', existingSection.id);

      if (updateError) {
        console.error('💾 Database update failed:', updateError);
        
        await supabase
          .from('policy_processing_log')
          .update({
            status: 'failed',
            error_message: `DB update failed: ${updateError.message}`,
            processing_time_ms: Date.now() - startTime
          })
          .eq('id', logEntry.id);

        throw updateError;
      }
      
      console.log('✅ Updated existing section with AI analysis');
    } else {
      // Insert new section
      const { error: insertError } = await supabase
        .from('policy_sections')
        .insert({
          policy_id: targetPolicy.id,
          section_title: aiAnalysis.section_title || sectionToProcess,
          section_content: aiAnalysis.section_content || sectionContent,
          plain_english_summary: aiAnalysis.plain_english_summary,
          category: aiAnalysis.category,
          risk_level: aiAnalysis.risk_level,
          order_index: Math.floor(Math.random() * 1000), // Simple ordering
          content_hash: contentHash
        });

      if (insertError) {
        console.error('💾 Database insert failed:', insertError);
        
        await supabase
          .from('policy_processing_log')
          .update({
            status: 'failed',
            error_message: `DB insert failed: ${insertError.message}`,
            processing_time_ms: Date.now() - startTime
          })
          .eq('id', logEntry.id);

        throw insertError;
      }
      
      console.log('✅ Inserted new section');
    }

    // Log successful completion
    await supabase
      .from('policy_processing_log')
      .update({
        status: 'completed',
        processing_time_ms: Date.now() - startTime,
        ai_tokens_used: aiTokensUsed
      })
      .eq('id', logEntry.id);

    // Update final status
    await supabase.rpc('update_processing_status', {
      p_active: false,
      p_error: null
    });

    console.log(`✅ Section processed successfully in ${Date.now() - startTime}ms`);

    return new Response(JSON.stringify({ 
      success: true, 
      section_title: sectionToProcess,
      policy_category: targetPolicy.category,
      processing_time_ms: Date.now() - startTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Processing failed:', error);
    
    // Update status with error
    await supabase.rpc('update_processing_status', {
      p_error: error.message,
      p_active: false
    });

    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});