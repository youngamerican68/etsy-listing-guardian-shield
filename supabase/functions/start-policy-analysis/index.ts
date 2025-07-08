import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user info from the auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Starting policy analysis job for user: ${user.id}`);

    // Check for existing pending/running jobs
    const { data: existingJobs, error: checkError } = await supabase
      .from('policy_analysis_jobs')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['pending', 'running'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (checkError) {
      console.error('Error checking existing jobs:', checkError);
      return new Response(JSON.stringify({ error: 'Failed to check existing jobs' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (existingJobs && existingJobs.length > 0) {
      return new Response(JSON.stringify({ 
        error: 'A policy analysis job is already running',
        existingJobId: existingJobs[0].id 
      }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get total number of policies to process for progress tracking
    const policiesResponse = await fetch('https://raw.githubusercontent.com/youngamerican68/etsy-listing-guardian-shield/main/policies.json');
    const policiesData = await policiesResponse.json();
    const policies = Array.isArray(policiesData) ? policiesData : policiesData.policies || [];
    
    // Create new analysis job
    const { data: jobData, error: jobError } = await supabase
      .from('policy_analysis_jobs')
      .insert({
        user_id: user.id,
        status: 'pending',
        progress_message: 'Job queued for processing',
        total_policies: policies.length
      })
      .select()
      .single();

    if (jobError) {
      console.error('Error creating analysis job:', jobError);
      return new Response(JSON.stringify({ error: 'Failed to create analysis job' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Created analysis job: ${jobData.id}`);

    // Trigger the background processing function
    try {
      const { error: triggerError } = await supabase.functions.invoke('process-policies-ai', {
        body: { jobId: jobData.id }
      });

      if (triggerError) {
        console.error('Error triggering background processing:', triggerError);
        // Update job status to failed
        await supabase
          .from('policy_analysis_jobs')
          .update({
            status: 'failed',
            error_message: 'Failed to start background processing',
            completed_at: new Date().toISOString()
          })
          .eq('id', jobData.id);
      }
    } catch (error) {
      console.error('Error triggering background function:', error);
      // Don't fail the request - the job is created and can be retried
    }

    return new Response(JSON.stringify({ 
      success: true,
      jobId: jobData.id,
      message: 'Policy analysis job started successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in start-policy-analysis function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});