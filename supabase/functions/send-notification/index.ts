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

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const fcmServerKey = Deno.env.get("FCM_SERVER_KEY");

    if (!fcmServerKey) {
      console.log("[send-notification] FCM_SERVER_KEY not configured");
      return new Response(
        JSON.stringify({ error: "FCM not configured. Add FCM_SERVER_KEY secret." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();

    // Check if this is a bulk send or single send
    if (body.notification_type) {
      // Bulk send based on notification type
      return await handleBulkSend(supabase, body as SendBulkNotificationRequest, fcmServerKey);
    } else {
      // Single notification send
      return await handleSingleSend(supabase, body as SendNotificationRequest, fcmServerKey);
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
  fcmServerKey: string
): Promise<Response> {
  let pushToken = request.push_token;

  // If user_id provided, fetch their push token
  if (request.user_id && !pushToken) {
    const { data: tokenData, error } = await supabase
      .from("user_push_tokens")
      .select("push_token")
      .eq("user_id", request.user_id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !tokenData) {
      console.log("[send-notification] No push token found for user:", request.user_id);
      return new Response(
        JSON.stringify({ error: "No push token found for user" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    pushToken = tokenData.push_token as string;
  }

  if (!pushToken) {
    return new Response(
      JSON.stringify({ error: "push_token or user_id required" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const result = await sendFcmNotification(fcmServerKey, pushToken, request.title, request.body, request.data);

  return new Response(
    JSON.stringify(result),
    { status: result.success ? 200 : 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

async function handleBulkSend(
  supabase: SupabaseClient,
  request: SendBulkNotificationRequest,
  fcmServerKey: string
): Promise<Response> {
  // Map notification type to preference column
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

  // Get all users who have this notification type enabled
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

  // Get push tokens for these users
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

  // Send notifications in parallel (with some rate limiting)
  const results = await Promise.allSettled(
    (tokens || []).map((t: { push_token: string; user_id: string }) => 
      sendFcmNotification(fcmServerKey, t.push_token, request.title, request.body, request.data)
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

async function sendFcmNotification(
  serverKey: string,
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Authorization": `key=${serverKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: pushToken,
        notification: {
          title,
          body,
          sound: "default",
        },
        data: data || {},
        priority: "high",
      }),
    });

    const result = await response.json();
    
    if (result.success === 1) {
      console.log("[send-notification] FCM success for token:", pushToken.slice(0, 20) + "...");
      return { success: true };
    } else {
      console.error("[send-notification] FCM error:", result);
      return { success: false, error: JSON.stringify(result.results) };
    }
  } catch (error: unknown) {
    console.error("[send-notification] FCM request failed:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

serve(handler);
