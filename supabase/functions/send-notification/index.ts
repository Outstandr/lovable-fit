import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendNotificationRequest {
  user_id?: string;
  push_token?: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface SendBulkNotificationRequest {
  notification_type: "daily_reminder" | "step_alert" | "streak" | "leaderboard";
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

// Generate JWT for FCM v1 API OAuth2 authentication
async function generateAccessToken(serviceAccount: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600; // 1 hour expiry

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: exp,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the private key
  const pemContents = serviceAccount.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");
  
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${unsignedToken}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  
  if (!tokenData.access_token) {
    console.error("[send-notification] Failed to get access token:", tokenData);
    throw new Error("Failed to get FCM access token");
  }

  return tokenData.access_token;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const firebaseServiceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");

    if (!firebaseServiceAccountJson) {
      console.log("[send-notification] FIREBASE_SERVICE_ACCOUNT not configured");
      return new Response(
        JSON.stringify({ error: "Firebase not configured. Add FIREBASE_SERVICE_ACCOUNT secret." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let serviceAccount: ServiceAccountKey;
    try {
      serviceAccount = JSON.parse(firebaseServiceAccountJson);
    } catch (e) {
      console.error("[send-notification] Failed to parse FIREBASE_SERVICE_ACCOUNT:", e);
      return new Response(
        JSON.stringify({ error: "Invalid FIREBASE_SERVICE_ACCOUNT JSON" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();

    console.log("[send-notification] Request received:", JSON.stringify(body));

    // Check if this is a bulk send or single send
    if (body.notification_type) {
      return await handleBulkSend(supabase, body as SendBulkNotificationRequest, serviceAccount);
    } else {
      return await handleSingleSend(supabase, body as SendNotificationRequest, serviceAccount);
    }
  } catch (error: unknown) {
    console.error("[send-notification] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

async function handleSingleSend(
  supabase: SupabaseClient,
  request: SendNotificationRequest,
  serviceAccount: ServiceAccountKey
): Promise<Response> {
  let pushToken = request.push_token;

  // If user_id provided, fetch their push token
  if (request.user_id && !pushToken) {
    console.log("[send-notification] Looking up token for user:", request.user_id);
    
    const { data: tokenData, error } = await supabase
      .from("user_push_tokens")
      .select("push_token")
      .eq("user_id", request.user_id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !tokenData) {
      console.log("[send-notification] No push token found for user:", request.user_id, error);
      return new Response(
        JSON.stringify({ error: "No push token found for user" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    pushToken = tokenData.push_token as string;
    console.log("[send-notification] Found token:", pushToken.slice(0, 20) + "...");
  }

  if (!pushToken) {
    return new Response(
      JSON.stringify({ error: "push_token or user_id required" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const result = await sendFcmV1Notification(serviceAccount, pushToken, request.title, request.body, request.data);

  return new Response(
    JSON.stringify(result),
    { status: result.success ? 200 : 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

async function handleBulkSend(
  supabase: SupabaseClient,
  request: SendBulkNotificationRequest,
  serviceAccount: ServiceAccountKey
): Promise<Response> {
  const preferenceMap: Record<string, string> = {
    daily_reminder: "daily_reminders",
    step_alert: "step_alerts",
    streak: "streak_notifications",
    leaderboard: "leaderboard_updates",
  };

  const preferenceColumn = preferenceMap[request.notification_type];
  if (!preferenceColumn) {
    return new Response(
      JSON.stringify({ error: "Invalid notification_type" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const { data: preferences, error: prefError } = await supabase
    .from("user_notification_preferences")
    .select("user_id")
    .eq(preferenceColumn, true);

  if (prefError) {
    console.error("[send-notification] Error fetching preferences:", prefError);
    return new Response(
      JSON.stringify({ error: "Failed to fetch user preferences" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const enabledUserIds = (preferences || []).map((p: { user_id: string }) => p.user_id);
  console.log(`[send-notification] Found ${enabledUserIds.length} users with ${request.notification_type} enabled`);

  if (enabledUserIds.length === 0) {
    return new Response(
      JSON.stringify({ success: true, sent: 0, message: "No users have this notification enabled" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const { data: tokens, error: tokenError } = await supabase
    .from("user_push_tokens")
    .select("push_token, user_id")
    .in("user_id", enabledUserIds);

  if (tokenError) {
    console.error("[send-notification] Error fetching tokens:", tokenError);
    return new Response(
      JSON.stringify({ error: "Failed to fetch push tokens" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  console.log(`[send-notification] Sending to ${tokens?.length || 0} devices`);

  const results = await Promise.allSettled(
    (tokens || []).map((t: { push_token: string; user_id: string }) => 
      sendFcmV1Notification(serviceAccount, t.push_token, request.title, request.body, request.data)
    )
  );

  const successful = results.filter(r => r.status === "fulfilled" && (r.value as { success: boolean }).success).length;
  const failed = results.length - successful;

  console.log(`[send-notification] Sent: ${successful}, Failed: ${failed}`);

  return new Response(
    JSON.stringify({ success: true, sent: successful, failed }),
    { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

async function sendFcmV1Notification(
  serviceAccount: ServiceAccountKey,
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[send-notification] Getting FCM access token...");
    const accessToken = await generateAccessToken(serviceAccount);
    
    const fcmEndpoint = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;
    
    const message = {
      message: {
        token: pushToken,
        notification: {
          title,
          body,
        },
        android: {
          priority: "high" as const,
          notification: {
            sound: "default",
            channel_id: "default",
          },
        },
        data: data || {},
      },
    };

    console.log("[send-notification] Sending to FCM v1 API...");
    
    const response = await fetch(fcmEndpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log("[send-notification] FCM v1 success:", result);
      return { success: true };
    } else {
      console.error("[send-notification] FCM v1 error:", result);
      return { success: false, error: JSON.stringify(result.error || result) };
    }
  } catch (error: unknown) {
    console.error("[send-notification] FCM request failed:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

serve(handler);
