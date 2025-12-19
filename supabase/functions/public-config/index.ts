// Lovable Cloud backend function: returns public runtime config
// NOTE: Google Maps browser key is publishable, so returning it is acceptable.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const googleMapsApiKey = Deno.env.get("VITE_GOOGLE_MAPS_API_KEY") ?? "";

  return new Response(JSON.stringify({ googleMapsApiKey }), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
});
