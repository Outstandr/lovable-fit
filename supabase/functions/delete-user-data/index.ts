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
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[delete-user-data] No authorization header');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // User client to get the authenticated user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the current user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !user) {
      console.error('[delete-user-data] User authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log(`[delete-user-data] Starting deletion for user: ${userId}`);

    // Use service role client for deletion operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Delete all user data from all tables
    const deletionResults = [];

    // 1. Delete daily steps
    const { error: stepsError, count: stepsCount } = await adminClient
      .from('daily_steps')
      .delete({ count: 'exact' })
      .eq('user_id', userId);
    deletionResults.push({ table: 'daily_steps', count: stepsCount, error: stepsError?.message });
    console.log(`[delete-user-data] Deleted ${stepsCount} daily_steps records`);

    // 2. Delete active sessions
    const { error: sessionsError, count: sessionsCount } = await adminClient
      .from('active_sessions')
      .delete({ count: 'exact' })
      .eq('user_id', userId);
    deletionResults.push({ table: 'active_sessions', count: sessionsCount, error: sessionsError?.message });
    console.log(`[delete-user-data] Deleted ${sessionsCount} active_sessions records`);

    // 3. Delete streaks
    const { error: streaksError, count: streaksCount } = await adminClient
      .from('streaks')
      .delete({ count: 'exact' })
      .eq('user_id', userId);
    deletionResults.push({ table: 'streaks', count: streaksCount, error: streaksError?.message });
    console.log(`[delete-user-data] Deleted ${streaksCount} streaks records`);

    // 4. Delete audiobook bookmarks
    const { error: bookmarksError, count: bookmarksCount } = await adminClient
      .from('audiobook_bookmarks')
      .delete({ count: 'exact' })
      .eq('user_id', userId);
    deletionResults.push({ table: 'audiobook_bookmarks', count: bookmarksCount, error: bookmarksError?.message });
    console.log(`[delete-user-data] Deleted ${bookmarksCount} audiobook_bookmarks records`);

    // 5. Delete protocol tasks
    const { error: tasksError, count: tasksCount } = await adminClient
      .from('protocol_tasks')
      .delete({ count: 'exact' })
      .eq('user_id', userId);
    deletionResults.push({ table: 'protocol_tasks', count: tasksCount, error: tasksError?.message });
    console.log(`[delete-user-data] Deleted ${tasksCount} protocol_tasks records`);

    // 6. Delete notification preferences
    const { error: notifError, count: notifCount } = await adminClient
      .from('user_notification_preferences')
      .delete({ count: 'exact' })
      .eq('user_id', userId);
    deletionResults.push({ table: 'user_notification_preferences', count: notifCount, error: notifError?.message });
    console.log(`[delete-user-data] Deleted ${notifCount} notification_preferences records`);

    // 7. Delete push tokens
    const { error: tokensError, count: tokensCount } = await adminClient
      .from('user_push_tokens')
      .delete({ count: 'exact' })
      .eq('user_id', userId);
    deletionResults.push({ table: 'user_push_tokens', count: tokensCount, error: tokensError?.message });
    console.log(`[delete-user-data] Deleted ${tokensCount} push_tokens records`);

    // 8. Delete user roles
    const { error: rolesError, count: rolesCount } = await adminClient
      .from('user_roles')
      .delete({ count: 'exact' })
      .eq('user_id', userId);
    deletionResults.push({ table: 'user_roles', count: rolesCount, error: rolesError?.message });
    console.log(`[delete-user-data] Deleted ${rolesCount} user_roles records`);

    // 9. Delete profile (should be last before auth user)
    const { error: profileError, count: profileCount } = await adminClient
      .from('profiles')
      .delete({ count: 'exact' })
      .eq('id', userId);
    deletionResults.push({ table: 'profiles', count: profileCount, error: profileError?.message });
    console.log(`[delete-user-data] Deleted ${profileCount} profile records`);

    // 10. Delete the auth user (using admin API)
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      console.error('[delete-user-data] Failed to delete auth user:', authDeleteError);
      deletionResults.push({ table: 'auth.users', count: 0, error: authDeleteError.message });
    } else {
      console.log(`[delete-user-data] Successfully deleted auth user: ${userId}`);
      deletionResults.push({ table: 'auth.users', count: 1, error: null });
    }

    // Check for any errors
    const errors = deletionResults.filter(r => r.error);
    if (errors.length > 0) {
      console.error('[delete-user-data] Some deletions failed:', errors);
    }

    console.log(`[delete-user-data] Deletion complete for user: ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Account and all data deleted successfully',
        details: deletionResults 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[delete-user-data] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
