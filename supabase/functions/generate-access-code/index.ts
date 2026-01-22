import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature",
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

// Verify webhook signature using HMAC-SHA256
async function verifyWebhookSignature(body: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const expectedSignature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return signature === expectedSignature;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
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
    // Verify webhook signature for security
    const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET");
    const signature = req.headers.get("x-webhook-signature");
    
    // Read body as text for signature verification
    const bodyText = await req.text();
    
    if (WEBHOOK_SECRET) {
      if (!signature) {
        console.error("Missing webhook signature");
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized - missing signature" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      const isValid = await verifyWebhookSignature(bodyText, signature, WEBHOOK_SECRET);
      if (!isValid) {
        console.error("Invalid webhook signature");
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized - invalid signature" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      console.log("Webhook signature verified successfully");
    } else {
      console.warn("WEBHOOK_SECRET not configured - skipping signature verification");
    }

    // Initialize Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: PurchaseWebhookRequest = JSON.parse(bodyText);
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
        customer_email: body.email || null,
        customer_name: body.name || null,
        product_name: body.product_name || null,
        purchase_id: body.order_id || null,
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
