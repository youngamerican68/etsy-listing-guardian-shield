// In supabase/functions/get-user-profile/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// These are the required CORS headers for preflight requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // This is the crucial CORS preflight handler.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- Step 1: Load Environment Variables ---
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // --- Step 2: Extract Auth Token ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Not authorized: Missing Authorization header.');
    const jwt = authHeader.replace('Bearer ', '');

    // --- Step 3: Authenticate User ---
    const { data: { user } } = await supabaseAdmin.auth.getUser(jwt);
    if (!user) throw new Error('Not authorized: Invalid token.');

    // --- Step 4: Fetch Profile ---
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (error) throw error;

    // --- Step 5: Return Success Response ---
    return new Response(JSON.stringify(profile), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    // --- Step 6: Return Error Response ---
    return new Response(String(err?.message ?? err), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
