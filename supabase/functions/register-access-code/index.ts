import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      console.log('Method not allowed:', req.method);
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { access_code, customer_email, customer_name, product_name, purchase_id } = await req.json();

    console.log('Received request to register access code:', { 
      access_code, 
      customer_email, 
      customer_name, 
      product_name, 
      purchase_id 
    });

    // Validate required field
    if (!access_code) {
      console.log('Missing access_code');
      return new Response(
        JSON.stringify({ success: false, error: 'access_code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if code already exists
    const { data: existingCode, error: checkError } = await supabase
      .from('access_codes')
      .select('id')
      .eq('code', access_code)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing code:', checkError);
      return new Response(
        JSON.stringify({ success: false, error: 'Database error while checking code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingCode) {
      console.log('Access code already exists:', access_code);
      return new Response(
        JSON.stringify({ success: false, error: 'Access code already exists' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert the new access code
    const { data: insertedCode, error: insertError } = await supabase
      .from('access_codes')
      .insert({
        code: access_code,
        customer_email: customer_email || null,
        customer_name: customer_name || null,
        product_name: product_name || null,
        purchase_id: purchase_id || null,
        is_used: false,
      })
      .select('id, code')
      .single();

    if (insertError) {
      console.error('Error inserting access code:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to register access code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Access code registered successfully:', insertedCode);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Access code registered successfully',
        code_id: insertedCode.id,
        code: insertedCode.code,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
