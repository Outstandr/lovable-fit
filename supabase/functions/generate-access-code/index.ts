import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a unique access code like HSP-A7B3C9D2
function generateAccessCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluding confusing chars like 0/O, 1/I
  let code = "HSP-";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

interface PurchaseWebhookRequest {
  // Customer info from payment processor
  email?: string;
  name?: string;
  customer_id?: string;
  order_id?: string;
  product_name?: string;
  
  // Optional: GHL webhook URL to forward the code
  ghl_webhook_url?: string;
  
  // Optional: Custom metadata
  metadata?: Record<string, unknown>;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Generate access code function called");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: PurchaseWebhookRequest = await req.json();
    console.log("Received webhook payload:", JSON.stringify(body, null, 2));

    // Generate unique access code
    let accessCode = generateAccessCode();
    let attempts = 0;
    const maxAttempts = 10;

    // Ensure code is unique
    while (attempts < maxAttempts) {
      const { data: existing } = await supabase
        .from("access_codes")
        .select("code")
        .eq("code", accessCode)
        .maybeSingle();

      if (!existing) break;
      
      accessCode = generateAccessCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error("Failed to generate unique access code after multiple attempts");
    }

    // Store the access code in the database
    const { data: insertedCode, error: insertError } = await supabase
      .from("access_codes")
      .insert({
        code: accessCode,
        is_used: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting access code:", insertError);
      throw new Error(`Failed to store access code: ${insertError.message}`);
    }

    console.log("Access code generated and stored:", accessCode);

    // Prepare response data
    const responseData = {
      success: true,
      access_code: accessCode,
      code_id: insertedCode.id,
      created_at: insertedCode.created_at,
      customer_email: body.email,
      customer_name: body.name,
      order_id: body.order_id,
    };

    // If GHL webhook URL is provided, forward the data
    if (body.ghl_webhook_url) {
      console.log("Forwarding to GHL webhook:", body.ghl_webhook_url);
      
      try {
        const ghlPayload = {
          access_code: accessCode,
          email: body.email,
          name: body.name,
          customer_id: body.customer_id,
          order_id: body.order_id,
          product_name: body.product_name || "Reset by Discipline",
          timestamp: new Date().toISOString(),
          ...body.metadata,
        };

        const ghlResponse = await fetch(body.ghl_webhook_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(ghlPayload),
        });

        console.log("GHL webhook response status:", ghlResponse.status);
        
        if (!ghlResponse.ok) {
          console.error("GHL webhook failed:", await ghlResponse.text());
          // Don't fail the whole request, just log it
        }
      } catch (ghlError) {
        console.error("Error calling GHL webhook:", ghlError);
        // Don't fail the whole request, just log it
      }
    }

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in generate-access-code function:", errorMessage);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
