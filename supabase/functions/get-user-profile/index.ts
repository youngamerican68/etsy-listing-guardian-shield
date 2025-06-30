// In supabase/functions/get-user-profile/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  console.log('--- get-user-profile function invoked ---');
  try {
    // --- Step 1: Check Environment Variables ---
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      throw new Error('Server configuration error.');
    }
    console.log('Environment variables loaded successfully.');

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // --- Step 2: Check Authorization Header ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header.');
      throw new Error('Not authorized: Missing token.');
    }
    console.log('Authorization header found.');
    const jwt = authHeader.replace('Bearer ', '');

    // --- Step 3: Authenticate User ---
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    if (userError || !user) {
      console.error('JWT validation error:', userError);
      throw new Error('Not authorized: Invalid token.');
    }
    console.log(`User authenticated: ${user.id}`);

    // --- Step 4: Fetch Profile ---
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile from DB:', profileError);
      throw new Error('Could not fetch user profile.');
    }
    console.log('Profile fetched successfully:', profile);

    return new Response(JSON.stringify(profile), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('--- Function execution failed ---');
    console.error(err.message);
    return new Response(String(err?.message ?? err), { status: 500 });
  }
});
