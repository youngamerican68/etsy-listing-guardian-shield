
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // 1. Handle CORS preflight and ensure correct HTTP method
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
  }

  try {
    // 2. Authorize the caller: Ensure only an existing admin can use this function.
    // Create a temporary client with the caller's authentication token.
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user: callerUser } } = await supabaseClient.auth.getUser()

    if (!callerUser) {
        return new Response(JSON.stringify({ error: 'Authentication failed' }), { status: 401, headers: corsHeaders })
    }

    // Check for admin role in the 'profiles' table for the caller
    const { data: callerProfile, error: callerError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', callerUser.id)
      .single()

    if (callerError || callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Caller is not an admin' }), { status: 403, headers: corsHeaders })
    }

    // 3. Authorization passed. Proceed with admin logic using the service role key.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email } = await req.json()
    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), { status: 400, headers: corsHeaders })
    }
    
    // 4. Find the target user efficiently by email.
    const { data: { user: targetUser }, error: getUserError } = await supabaseAdmin.auth.admin.getUserByEmail(email);

    if (getUserError || !targetUser) {
      return new Response(JSON.stringify({ error: 'User not found with that email' }), { status: 404, headers: corsHeaders })
    }
    
    // 5. Use 'upsert' to robustly create or update the profile role.
    const { error: upsertError } = await supabaseAdmin
      .from('profiles')
      .upsert({ id: targetUser.id, role: 'admin' })

    if (upsertError) throw upsertError;

    return new Response(JSON.stringify({ message: `User ${email} has been made an admin.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
