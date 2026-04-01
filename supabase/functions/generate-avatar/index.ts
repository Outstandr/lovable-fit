import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageBase64 } = await req.json()
    if (!imageBase64) {
      throw new Error("Missing imageBase64 payload")
    }

    // Get Auth Context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error(`Unauthorized: ${userError?.message}`)
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY in environment variables")
    }

    // Step 1: Vision Extraction using Gemini 1.5 Flash
    const visionPrompt = "You are an expert character artist. Analyze this selfie and describe the person's physical features to be used as a prompt for a 3D Pixar style avatar. Describe their hair style, hair color, eye shape, skin tone, facial hair (if any), and facial structure. Do NOT mention their real identity or age specifically. Just physical traits. Format your response exactly as the start of an image generation prompt, starting with: 'A 3D Pixar style character avatar of a person with...'"
    
    // remove data:image/jpeg;base64, prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|webp);base64,/, "");

    const visionPayload = {
      contents: [{
        parts: [
          { text: visionPrompt },
          { inline_data: { mime_type: "image/jpeg", data: cleanBase64 } }
        ]
      }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 200,
      }
    };

    console.log("Calling Gemini 1.5 Flash Vision API...")
    const visionRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(visionPayload)
    });

    if (!visionRes.ok) {
        const errText = await visionRes.text();
        console.error("Vision API Error:", errText);
        throw new Error(`Gemini Vision Error: ${visionRes.status} ${visionRes.statusText}`);
    }

    const visionData = await visionRes.json();
    const extractedPrompt = visionData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!extractedPrompt) {
        throw new Error("Failed to extract prompt from selfie.");
    }
    
    console.log("Extracted Prompt:", extractedPrompt);

    // Step 2: Generate the Avatar using Imagen 3
    const finalPrompt = `${extractedPrompt.trim()}, wearing modern cyberpunk activewear athletic clothing, solid vibrant gradient background, high quality, highly detailed 3D render.`

    console.log("Calling Imagen 3 API...")
    const imagenPayload = {
      instances: [
        {
          prompt: finalPrompt
        }
      ],
      parameters: {
        sampleCount: 1,
        // Optional override to avoid filtering
        personGeneration: "ALLOW_ADULT"
      }
    };

    const generateRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(imagenPayload)
    });

    if (!generateRes.ok) {
      const errText = await generateRes.text();
      console.error("Imagen API Error:", errText);
      throw new Error(`Imagen Generation Error: ${generateRes.status} ${errText}`);
    }

    const generateData = await generateRes.json();
    const generatedBase64 = generateData.predictions?.[0]?.bytesBase64Encoded;

    if (!generatedBase64) {
      throw new Error("Failed to receive image bytes from Imagen 3.");
    }

    // Step 3: Upload to Supabase Storage
    const fileName = `${user.id}_avatar_${Date.now()}.jpg`;
    const imageBytes = Uint8Array.from(atob(generatedBase64), c => c.charCodeAt(0));

    // Service role admin for upload strictly to avoid user RLS blocking from within Edge Function
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log("Uploading to Supabase Storage avatars bucket...")
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(fileName, imageBytes.buffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.error("Storage Upload Error:", uploadError);
      throw new Error(`Storage Error: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return new Response(
      JSON.stringify({ success: true, avatarUrl: publicUrl, promptUsed: finalPrompt }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error("Edge function error:", error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
