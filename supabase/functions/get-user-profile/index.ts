
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// WARNING: The service_role key has super-admin rights. Do not expose it publicly.
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('get-user-profile: Function invoked');
    
    // 1. Get the user's JWT from the auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header found');
    }
    
    const jwt = authHeader.replace('Bearer ', '');
    console.log('get-user-profile: JWT extracted');
    
    // 2. Get the user object from the JWT
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    if (userError || !user) {
      console.error('get-user-profile: Error getting user:', userError);
      throw new Error('User not found or invalid token');
    }
    
    console.log('get-user-profile: User authenticated:', user.id);
    
    // 3. Use the admin client to fetch the user's profile, bypassing RLS
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();
    
    if (error) {
      console.error('get-user-profile: Database error:', error);
      throw error;
    }
    
    console.log('get-user-profile: Profile fetched successfully:', profile);
    
    return new Response(JSON.stringify(profile), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('get-user-profile: Function error:', err);
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
