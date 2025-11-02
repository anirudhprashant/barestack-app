// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'npm:@supabase/supabase-js';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 405,
    });
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password are required' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      const msg = error?.message || String(error);
      if (/already exists/i.test(msg)) {
        return new Response(JSON.stringify({ error: 'User already exists' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 409,
        });
      }
      console.error('Supabase admin createUser error:', msg);
      return new Response(JSON.stringify({ error: 'Failed to create user' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ user: data.user }), {
      headers: { 'Content-Type': 'application/json' },
      status: 201,
    });
  } catch (err) {
    console.error('Edge Function error:', (err as Error).message);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});